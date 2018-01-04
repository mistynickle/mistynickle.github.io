/******************************************
*          ____   _   _   _   ____
*         |    \ | | | \ | | |  __|
*         |  = | | | |  \| | | |__
*         |  __/ | | | \   | |  __|
*         | |    | | | |\  | | |__ 
*         |_|    |_| |_| \_| |____|
*
*            4.8 Alpha      /\
*          by: Seph Reed   X  X
*                           \/
*
********************************************/

"use strict"









var PINE = function(arg1, arg2, arg3) {
	if(typeof arg1 == "string") {
		var out = PINE.NEEDLES.create(arg1);

		if(typeof arg2 == "string" && typeof arg3 == "function") 
			out.addInitFn(arg2, arg3);
		
		else if ((typeof arg2 == "function") && arg3 === undefined) 
			out.addInitFn(PINE.ops.COMMON, arg2);

		else if(arg2 == undefined && arg3 == undefined) {}

		else PINE.err("bad PINE() call");
		
		return out;
	}
}

PINE.createNeedle = function(matchCase, arg1, arg2) {
	var fn, args;
	if(typeof arg1 == "function" && arg2 == undefined)
		fn = arg1;
	else if(typeof arg1 == "object" && typeof arg2 == "function") {
		fn = arg2;
		args = arg1;
	}
	else if(typeof arg1 == "string" && typeof arg2 == "function") {
		fn = arg2;
		args = {};
		args.opType = arg1;
	}

	var out = PINE.NEEDLES.create(matchCase, args);

	if(fn) fn.call(out, out);

	return out;
}


PINE.class = {};

var U = PINE.UTILITIES = {};


PINE.loaded = false;

PINE.evals = [];



PINE.SVGNS = "http://www.w3.org/2000/svg";


/**********************************
*	 	PINE INTERFACE FUNCTIONS 
**********************************/

var ev = PINE.events = {};
PINE.events.load = "load";
PINE.events.logUpdate = "logUpdate";
PINE.validEvents = [ev.load, ev.logUpdate];
PINE.eventListeners = {};

PINE.addEventListener = function(type, callback) {
	if(PINE.validEvents.indexOf(type) != null) {
		if(PINE.eventListeners[type] === undefined)
			PINE.eventListeners[type] = [];

		PINE.eventListeners[type].push(callback);

		if(type == PINE.events.load && PINE.loaded == true) {
			callback();
		}
	}
	else {
		PINE.err("event of type:"+type+" has no meaning for PINE.  not valid.  see PINE.validEvents");
	}
}

PINE.ready = function(callback) {
	// PINE.addEventListener(PINE.events.load, callback);

	PINE.waitForNeed("PINE_READY", callback);
}


PINE.disabledNeedles = [];

PINE.disable = function(needles) {
	PINE.disabledNeedles = PINE.disabledNeedles.concat(needles);
}




PINE.nextClassID = 0;
PINE.createNewClassID = function() {
	return "el_"+PINE.nextClassID++;
}




/**********************************
*	 	ORDER OF OPERATIONS 
**********************************/

PINE.ops = {};

PINE.ops.order = [
	PINE.ops.INIT = "init",
	PINE.ops.PVARS = "pvars",
	PINE.ops.STATIC = "static",
	PINE.ops.COMMON = "common",
	PINE.ops.GATHER = "gather"
]

PINE.ops.branchFirst = [
	PINE.ops.GATHER
]

// PINE.ops.POLISH = PINE.ops.GATHER;


//INIT assumes nothing.  It is used to set initial values (usually PVARS) prior to permeation or inline pvars.  
//PVARS assumes all core values (usually PVARS) are set except those to be set by "[pvars]".  PVARS is a special step for the "[pvars]" tag.
//DEPRECATED : PNV assumes all core values (usually PVARS) including those set by "[pvars]" are set and ready to be displayed
//STATIC assumes all core values (usually PVARS) are set.  STATIC functions have no inline attribute dependencies.
//COMMON assumes all values are properly set, both inline and PVAR.
//GATHER assumes the growth from it is complete.  
// 		It is important that any Needles which mod their children do so during a POLISH stage.
// 		All generative content added by POLISH should be repermeated.






/**********************************
*	 	NEEDLE STUFF
* do they inject functionality?
* are they the last step in the pine branching process?
* do they fulfill a need?
* YES
**********************************/

PINE.NEEDLES = {};
PINE.NEEDLES.byName = {};
PINE.NEEDLES.listeners = {};

PINE.NEEDLES.get = function(matchCase) {
	return PINE.NEEDLES.byName[matchCase];
}

PINE.NEEDLES.create = function(matchCase, args) {
	if (PINE.disabledNeedles.indexOf(matchCase) !== -1) {
		U.log("info", "Needle of type: "+matchCase+" disabled")
		var dummyNeedle = {};
		dummyNeedle.addFunction = function(){};
		return dummyNeedle;
	}

	else if(PINE.NEEDLES.byName[matchCase] === undefined) {
		var addMe = new PINE.class.Needle(matchCase, args);
		PINE.NEEDLES.byName[matchCase] = addMe;
		return addMe;
	}
	
	else PINE.err("creating already created needle '"+matchCase+"'");
}


PINE.NEEDLES.getMatchCases = function(domNode) {
	var out = [];
	for(var name in PINE.NEEDLES.byName) {
		var needle = PINE.NEEDLES.byName[name];
		if(needle.checkForMatchCase(domNode) == true)
			out.push(needle);
	}
	return out;
}


PINE.NEEDLES.runningInits = [];









/******************************
*
*		Needle Class
*
********************************/


PINE.class.Needle = function(matchCase, args) {
	this.matchCase = matchCase;
	this.supers = {};
	this.FNS = {};
	this.inits = {};
	this.inits.list = [];
	this.inits.byOp = {};
	this.attArgs = {};
	this.selectors = {};
	this.selectors.list = [];
	this.selectors.byName = {};

	if(args && args.extend) {
		if(typeof args.extend == "string")
			args.extend = [args.extend];

		for(var i in args.extend) {
			this.extend(args.extend[i]);
		}	
	}
}


PINE.NEEDLES.nextFnID = 0;
PINE.class.Needle.prototype.addOp = PINE.class.Needle.prototype.addInitFn = function(arg1, arg2) {
	var needle = this;
	var opType, fn, isAsync, isMultirun, watchSelector;
	if(typeof arg1 == "string" && typeof arg2 == "function") {
		opType = arg1;
		fn = arg2;
	}
	else if(typeof arg1 == "function" && arg2 == undefined) {
		fn = arg1;
	}
	else if(typeof arg1 == "object") {
		opType = arg1.opType;
		isAsync = arg1.isAsync;
		isMultirun = arg1.isMultirun;
		watchSelector = arg1.watchSelector;

		if(typeof arg2 == "function")
			fn = arg2;

		else if(arg2 == undefined)
			fn = arg1.fn;

		else PINE.err("bad addInitFn() call", needle);
	}

	else PINE.err("bad addInitFn() call", needle);

	if(watchSelector) {
	 	// var attArg = needle.attArgs[watchSelector];
	 	var attArg = needle.selectors.byName[watchSelector];

	 	if(attArg === undefined)
			return PINE.err("selector for '"+watchSelector+"' must be added before watcher", needle);

		else {

		}
	}


	var addMe = {};
	addMe.ID = PINE.NEEDLES.nextFnID++;
	addMe.needle = needle;
	addMe.opType = opType || PINE.ops.COMMON;
	addMe.isAsync = isAsync == true;
	addMe.isMultirun = isMultirun == true;
	addMe.watchSelector = watchSelector;



	addMe.fn = function() {
		var instance = this;
		return new SyncPromise(function(resolve) {
			var args = {};

			if(addMe.watchSelector !== undefined) {
				var selector = instance.selectors[addMe.watchSelector];
				args.addedNodes = selector.fnBacklogs[addMe.ID].added;
				args.removedNodes = selector.fnBacklogs[addMe.ID].removed;

				selector.fnBacklogs[addMe.ID].added = undefined;
				selector.fnBacklogs[addMe.ID].removed = undefined;
			}
			

			if(addMe.isAsync)  {
				// console.log("async instance called")
				PINE.NEEDLES.runningInits.push(addMe);
				args.resolve = args.complete = function() {
					U.removeFromArray(addMe, PINE.NEEDLES.runningInits);
					resolve();
				}
				fn.call(instance, instance, args);
			}

			else {
				fn.call(instance, instance, args);
				resolve();
			}
			
		});
	}


	if(this.inits.byOp[addMe.opType] == undefined)
		this.inits.byOp[addMe.opType] = [];

	this.inits.byOp[addMe.opType].push(addMe);
	this.inits.list.push(addMe);
}



// PINE.class.Needle.prototype.addLiveOp = function(liveselector, arg1, arg2) {

// }


//Change job.attArg.whatevs to job.getArg("lalal")
PINE.class.Needle.prototype.addAttArg = function(nameOrObject, attNames, type, defaultVal, defaultAttVal) {
	var addMe = {};

	if(typeof nameOrObject == "object") {
		var args = nameOrObject;
		addMe.name = args.argName;
		addMe.attNames = args.attNames;
		addMe.type = args.argType;
		addMe.defaultVal = args.defaultVal;
		addMe.defaultValFn = args.defaultAttVal;
		addMe.defaultAttVal = args.defaultAttVal;
		addMe.arrayed = args.isArrayable;
	}
	else if(typeof nameOrObject == "string") {
		addMe.name = nameOrObject;
		addMe.attNames = attNames;
		addMe.type = type;
		addMe.defaultVal = defaultVal;
		addMe.defaultAttVal = defaultAttVal;
	}

	else PINE.err("attArg requires a string or argument object, not ", nameOrObject);
	

	if(addMe.type.toLowerCase() !== "liveselector")
		this.attArgs[addMe.name] = addMe;
	else {
		addMe.fns = {};
		this.selectors.list.push(addMe);
		this.selectors.byName[addMe.name] = addMe;
	}
	
}

PINE.class.Needle.prototype.addFN = function(name, fn) {
	this.FNS[name] = fn;
}


// PINE.class.Needle.prototype.onLiveSelectorAddItem = function(name, arg1, arg2) {
// 	var needle = this;
// 	var selector = needle.selectors.byName[name];

// 	if(selector == undefined)
// 		return PINE.err("selector for '"+name+"' must be added before watcher", needle);

// 	var fn, opType
// 	if(typeof arg1 == "function" && arg2 == undefined) {
// 		opType = PINE.ops.COMMON; 
// 		fn = arg1;
// 	}
// 	else if(typeof arg1 == "string" && typeof arg2 == "function") {
// 		opType = arg1;
// 		fn = arg2;
// 	}

// 	var addMe = {};
// 	addMe.opType = opType;
// 	addMe.fn = fn;

// 	if(selector.fns[opType] == undefined)
// 		selector.fns[opType] = [];

// 	selector.fns[opType].push(addMe);
// }

//check if the domNode matches the needles match case, if so, inject
PINE.class.Needle.prototype.tryInject = function(domNode) {
		//
	if(domNode.__pine__.instances[this.matchCase] == undefined) {
		if(this.checkForMatchCase(domNode) == true) 
			this.inject(domNode);
	}
}


PINE.class.Needle.prototype.inject = function(domNode) {
	
	var needle = this;
	var instance = new PINE.class.Instance(needle, domNode);
	domNode.__pine__.instances[needle.matchCase] = instance;
}


PINE.class.Needle.prototype.checkForMatchCase = function(domNode) {
	return PINE.keyApplies(this.matchCase, domNode);
}


PINE.class.Needle.prototype.extend = function(extendNeedleOrName) {

	
	var needle = this;
	var extendMe;

	if(typeof extendNeedleOrName == "string")
		extendMe = PINE.NEEDLES.get(extendNeedleOrName);
	else
		extendMe = extendNeedleOrName;

	if(extendMe === undefined)
		return PINE.err("can not extend a non existant needle", extendNeedleOrName, needle);

	// console.log("extending", extendMe);

	needle.supers[extendMe.matchCase] = extendMe;

	for(var key in extendMe.FNS)
		needle.FNS[key] = extendMe.FNS[key];

	for(var opType in extendMe.inits.byOp) {
		if(needle.inits.byOp[opType] == undefined)
			needle.inits.byOp[opType] = [];

		needle.inits.byOp[opType] = needle.inits.byOp[opType].concat(extendMe.inits.byOp[opType]);
	}
	needle.inits.list = needle.inits.list.concat(extendMe.inits.list);

	for(var att in extendMe.attArgs)
		needle.attArgs[att] = extendMe.attArgs[att];
}





/******************************
*
*		Instance Class
*
********************************/


//Class which represents the scope of a needle injection
PINE.class.Instance = function(needle, domNode) {
	var instance = this;
	instance.domNode = domNode;
	instance.needle = needle;
	instance.PVARS = domNode.PVARS;
	instance.ranInits = [];


	//acceptance of predefined node FNS, and inheritance of needle's
	instance.FNS = domNode.FNS;
	instance.superFNS = {};
	for(var key in needle.FNS) {
		(function(key) {
			if(domNode.FNS[key] == undefined) {
				instance.superFNS[key] = domNode.FNS[key] = function() {
					return needle.FNS[key].apply(instance, arguments);
				}
			}
			else PINE.err("adding an already taken FNS name "+key, domNode, needle);
		})(key)
	}

	//creation of live attarg requesters
	instance.attArg = {};
	for(var name in instance.needle.attArgs) {
		(function(attArg) {
			Object.defineProperty(instance.attArg, name, {
				get: function() {
					return El.attArg(instance.domNode, attArg.attNames, attArg.type, attArg.defaultVal, attArg.defaultAttVal);
				}
			});	
		})(instance.needle.attArgs[name])
	}


	//initialize live selectors
	var selectors = instance.needle.selectors.list;
	instance.selectors = {};

	for(var i in selectors) {
		(function(selector) {

			//css selector with change log and list of functions to notify
			var addMe = {}; 
			addMe.items = [];
			addMe.name = selector.name;

			addMe.fnBacklogs = [];			

			
			//initiate as normal attArg, to work for state.getArg()
			Object.defineProperty(instance.attArg, selector.name, {
				get: function() {
					return addMe.items
				}
			});	



			//create backlog updateFn
			addMe.lastUpdateID = -1;
			addMe.updateFnBacklog = function(fnID) {

				//update the match list if it hasn't been done recently
				if(addMe.lastUpdateID < PINE.currentUpdateID) {
					addMe.lastUpdateID = PINE.currentUpdateID;

					addMe.items = U.nodeListToArray(
						El.attArg(instance.domNode, selector.attNames, "selector", undefined, selector.defaultVal)
					);
				}

				var backlog = addMe.fnBacklogs[fnID];
				var matches = addMe.items;

				if(backlog == undefined) {
					backlog = addMe.fnBacklogs[fnID] = {};
					backlog.known = [];
					backlog.added = matches;
					backlog.removed = [];
				}
				else {
					backlog.added = [];
					backlog.removed = backlog.known.slice(0);

					// console.log(backlog.known, matches);

					for(var i = 0; i < matches.length; i++) {
						var match = matches[i];
						var target = backlog.known.indexOf(match);

						//if match is known, must not have been removed
						if(target !== -1) 
							backlog.removed.splice(target, 1);
						
						//if match is unknown, must be new
						else backlog.added.push(match);
					}

					backlog.known = matches;
				}
			}

		
			//add to selectors for overall instance
			instance.selectors[addMe.name] = addMe;
			
		})(selectors[i])
	}
}



PINE.class.Instance.prototype.tryOp = function(opType) {
	var instance = this;
	var opFns = instance.needle.inits.byOp[opType];

	var promises = []
	for(var i in opFns) {
		var opFn = opFns[i];
		var preRan = instance.ranInits.includes(opFn);
		var hasSelectorsBacklog;
		var selector = opFn.watchSelector ? instance.selectors[opFn.watchSelector] : undefined;

		if(selector) {
			selector.updateFnBacklog(opFn.ID);
			hasSelectorsBacklog = selector.fnBacklogs[opFn.ID].added.length;
		}

		

		if(opFn.isMultirun || preRan == false || hasSelectorsBacklog) {
			promises.push(opFn.fn.call(instance));

			if(preRan == false)
				instance.ranInits.push(opFn);
		}
	}
	return SyncPromise.all(promises);
};



PINE.class.Instance.prototype.getArg = function(name) {
	return this.attArg[name];
};






/******************************
*
*		Needs Helper
*
********************************/

PINE.unmetNeeds = [];
PINE.needsListeners = {};
PINE.waitForNeed = PINE.waitForNeeds = function(needs, callback) {
	if(typeof needs == "string")
		needs = [needs];

	if(typeof needs == "object" && needs.length) {
		var addMe = {};
		addMe.needs = needs;
		addMe.callback = callback;

		for(var i = 0; i < needs.length; i++) {
			var needName = needs[i];
			if(PINE.needsListeners[needName] == "READY") {
				needs.splice(i, 1);
				i--;
			}
			else {
				if(PINE.needsListeners[needName] == undefined)
					PINE.needsListeners[needName] = [];

				PINE.needsListeners[needName].push(addMe);
			}	
		}

		if(needs.length == 0)
			callback();

		else
			PINE.unmetNeeds.push(addMe);
	}
	else
		PINE.err("Needs must be a string or array", needs);
}


PINE.isNeedReady = function() {
	return PINE.needsListeners[needName] == "READY";
} 


PINE.signalNeedMet = PINE.signalReadyNeed = PINE.signalNeedReady = function(needName) {
	var listeners = PINE.needsListeners[needName];
	if(listeners == "READY") return;

	for(var i = 0; listeners && i < listeners.length; i++) {
		var listener = listeners[i];

		var target = listener.needs.indexOf(needName);
		listener.needs.splice(target, 1);

		if(listener.needs.length == 0) {
			var spliceAt = PINE.unmetNeeds.indexOf(listener);
			PINE.unmetNeeds.splice(spliceAt, 1);
			listener.callback();
		}
	}

	PINE.needsListeners[needName] = "READY";
}









/**********************************
*	 	RUN HELPERS
**********************************/

PINE.keyApplies = function(keyword, domNode)  {
	if(keyword == '*') return true;
		//
	else if(keyword && domNode)  {
		keyword = keyword.toUpperCase();
		if(keyword.charAt(0) == '[')  {
			var att = keyword.replace(/\[|\]/g, '');
			return domNode.hasAttribute 
				&& (domNode.hasAttribute(att) || domNode.hasAttribute(att.toLowerCase()));	
		}
		else return domNode.tagName == keyword;
	}
	return false;
}







/**********************************
*	 	          RUN
*
**********************************/

PINE.run = function() { 

	PINE.debug.init();
	LOG("overview", "DOMContentLoaded");

	U.initScriptMode()
	.syncThen(PINE.loadResources)
	.syncThen(PINE.sprout)
	.syncThen(function() {
  		PINE.loaded = true;


  		U.log("success", "PINE Run complete");
  		LOG("overview", "PINE Finished");	



  		PINE.signalNeedMet("PINE_READY");
  		// var listeners = PINE.eventListeners[PINE.events.load];

  		// for(var i in listeners)
  		// 	listeners[i]();
	});
	
}





PINE.loadResources = function() {
	LOG("overview", "Loading Resources");	
	var promises = [];

	var resources = U.nodeListToArray(document.getElementsByTagName("needle"));
	resources.concat(U.nodeListToArray(document.getElementsByTagName("resource")));

	for( var i_r = 0; i_r < resources.length; i_r++ ) {
		promises.push(PINE.runResource(resources[i_r]));
	}

	return SyncPromise.all(promises);	
}

PINE.addedResources = {};
PINE.runResource = function(domNode) {
		//
	return new SyncPromise(function(resolve, reject) {
			//
		var src = El.attr(domNode, "src");

		if(PINE.addedResources[src] !== undefined) resolve();

		else {
			PINE.addedResources[src] = domNode;
			var needAlias = El.attr(domNode, "needAlias");

			if(needAlias) {
				var oldResolve = resolve;
				resolve = function() {
					PINE.signalNeedReady(needAlias);
					oldResolve();
				}
			}

			LOG("overview", "Adding Resource "+src);	

			U.Ajax.get(src).syncThen( function(request) {
				var response = request.response;
				if(src.includes('.js')) {
					U.runScript(response, domNode, src).syncThen(resolve);
				}

				else if(src.match(/\.css\s*$/g)) {
					var styleNode = document.createElement("style");
					styleNode.innerHTML = response;
					domNode.appendChild(styleNode);
					resolve();
				}
				else {
					

					// var promises = [];
					var promise;

					response = response.replace(/<script(.|\s)*?>(\s|.)*?<\/script>/g, function(replaceMe) {
						replaceMe = replaceMe.replace(/<script(.|\s)*?>|<\/script>/g, '')
						// var promise = U.runScript(replaceMe, domNode, src);
						var addMe = U.runScript(replaceMe, domNode, src);
						promise = promise ? promise.syncThen(addMe) : addMe;
						// promises.push(promise);
						return '';
					});

					domNode.innerHTML += response;

					// Promise.all(promises).then(resolve);
					promise.syncThen(resolve);
				}

			}, reject);
		}
	});

}


PINE.inBoundsNode = function(domNode) {
	if(El.attr(domNode, "NOPINE") !== undefined) 
		return false;	

	if(domNode.nodeName == "#text" || domNode.nodeName == "#comment")
		return false;	

	return true;
}

PINE.endNode = function(domNode) {
	return El.attr(domNode, "PINEEND") !== undefined;
}

PINE.permeate = function(root, fn) {
	
	if(PINE.inBoundsNode(root) == false)
		return;
	
	fn(root);

	if(PINE.endNode(root) == false) {
		var branches = root.childNodes;
		for(var i = 0; branches && i < branches.length; i++)  
			PINE.permeate(branches[i], fn);
	}
}






/******************************************
*   ___   ___   ___   ___   _ _   ___
*  |  _| | _ \ | _ \ |   | | | | |_ _|
*  |_  | |  _/ |   / | | | | | |  | |
*  |___| |_|   |_|\_\|___| |___|  |_|
*
********************************************/


//the major function for PINE.  it creates the super root (PINE.forest), initiates it, and runs
//sprout on it using the queued pine funcs array (which all new pine funcs are added to)
PINE.sprout = function() {
	if(PINE.forest == null) {
		PINE.forest = {};
		PINE.forest.attributes = {};
		PINE.forest.tagName = "_PINE_FOREST";
	}

	var Pine_Forest = PINE.forest;
	Pine_Forest.childNodes = El.firstsOfKey(document, "PINE", false);

	//default to using body if "PINE" tag is never used
	if(Pine_Forest.childNodes == null)
		Pine_Forest.childNodes = [document.body];
	

	return PINE.updateAt(Pine_Forest);
}





//TODO: micro improve performance by not running empty updates
PINE.currentUpdateID = 0;
PINE.updateAt = function(root, passedOps) {
	PINE.currentUpdateID++;

	var newRoot = (root.__pine__ === undefined);
	// console.log(root);
	if(newRoot) {
		// console.log("new root", root, root.__pine__);
		PINE.initiate(root);
		PINE.spreadNeedles(root);
	}
	else if(root.__pine__.held) 
		return SyncPromise.resolved();


	// if(passedOps == undefined) {
	// 	var parentPassed = root.parentNode && root.parentNode.__pine__ ? root.parentNode.__pine__.passedOps : undefined;
	// 	passedOps = passedOps || parentPassed || PINE.ops.order;
	// 	console.log("parentPassed", parentPassed ? parentPassed.length : undefined, passedOps.length);
	// }
		
	// console.log(root, "updateAt");
	// PINE.dispatchChildNodeChanges(root);
	passedOps = passedOps || PINE.ops.order;
	return PINE.growOps(root, passedOps);
}

// PINE.dispatchChildNodeChanges = function(domNode) {

// 	PINE.permeate(domNode, function(domNode) {
// 		if(domNode.__pine__.knownChildren === undefined) {
// 			domNode.__pine__.knownChildren = [];

// 			for(var i = 0; i < domNode.childNodes.length; i++) {
// 				var child = domNode.childNodes[i];
// 				domNode.__pine__.knownChildren.push(child);
// 			}
// 		}
// 		else {
// 			console.log(domNode);

// 			var removedChildren = domNode.__pine__.knownChildren;
// 			var knownChildren = domNode.__pine__.knownChildren = [];
// 			var addedChildren = [];

// 			console.log("knownChildrenBefore", removedChildren);
// 			for(var i = 0; i < domNode.childNodes.length; i++) {
// 				var child = domNode.childNodes[i];
// 				var target = knownChildren.indexOf(child);

// 				if(target !== -1) 
// 					removedChildren.splice(target, 1);
				
// 				else addedChildren.push(child);

// 				knownChildren.push(child);
// 			}

// 			if(domNode.dispatchEvent && (removedChildren.length || addedChildren.length)) {
// 				domNode.dispatchEvent(new CustomEvent("PINE_nodesChanged", {
// 					detail : {
// 						addedNodes : addedChildren,
// 						removedNodes : removedChildren
// 					},
// 					bubbles : true,
// 					cancelable : true
// 				}));
// 			}
// 		}	
// 	});	
// }


// //initiate traverses the entire dom tree from root adding a variable for pine (__pine__)
PINE.initiate = function(root) {
	var addedNodes = [];
	PINE.permeate(root, function(domNode) {
		//if not initiated, do so
		if(domNode.__pine__ === undefined){
			addedNodes.push(domNode);
			domNode.__pine__ = {};
				//
			domNode.__pine__.held = false;
			domNode.__pine__.queue = [];
			domNode.__pine__.passedOps = [];
			domNode.__pine__.instances = {};
		}

		//pvars might be defined before an initiation
		if(domNode.PVARS === undefined)
			domNode.PVARS = {};

		if(domNode.PVARS.this === undefined)
			domNode.PVARS.this = domNode; 

		if(domNode.FNS === undefined)
			domNode.FNS = {};
	});
	

	if(root.dispatchEvent == undefined)
		root = document.body;

	root.dispatchEvent(new CustomEvent("nodesPineInitiated", {
		detail : {
			nodes : addedNodes
		},
		bubbles : true,
		cancelable : true
	}));
}



PINE.spreadNeedles = function(root) {
	PINE.permeate(root, function(domNode) {
		var matches = PINE.NEEDLES.getMatchCases(domNode);

		for (var i in matches) {
			var needle = matches[i];
			needle.tryInject(domNode);
		}
	});
}





PINE.growOps = function(root, ops) {
	var promises = [];

	for(var i in ops) 
		promises.push(PINE.grow(root, ops[i]));

	return SyncPromise.all(promises);
}



PINE.grow = function(root, opType) {
	return new SyncPromise(function(resolve) {
		if(PINE.inBoundsNode(root) == false){
			resolve(); return;
		}

		var isRootFirst = PINE.ops.branchFirst.indexOf(opType) == -1;

		var applyOp = function() {
			root.__pine__.held = true;

			if(isRootFirst) {
				applyInstances().syncThen(function() {
					unholdAndDequeue();
					PINE.growChildren(root, opType).syncThen(resolve);
				})
			}
			else {
				PINE.growChildren(root, opType).syncThen(applyInstances).syncThen(function() {
					unholdAndDequeue();
					resolve();
				})
			}		
		}

		var applyInstances = function() {
			var instances = root.__pine__.instances;
			var initPromises = [];
			for(var i in instances)
				initPromises.push(instances[i].tryOp(opType));

			return SyncPromise.all(initPromises);
		}

		var unholdAndDequeue = function() {
			root.__pine__.held = false;
			root.__pine__.passedOps.push(opType);

			var queue = root.__pine__.queue;
			if(queue.length)
				queue.shift()();
		}
		

		if(root.__pine__ == undefined) {
			var passedOps = root.parentNode.__pine__.passedOps;
			PINE.updateAt(root, passedOps).syncThen(applyOp);
		}
		else if(root.__pine__.held == true) 
			root.__pine__.queue.push(applyOp);
		

		else applyOp();
	});
}

PINE.growChildren = function(root, opType) {
		//
	if(PINE.endNode(root) == true) 
		return SyncPromise.resolved();

	var childNodes = root.childNodes;
	var promises = [];

	for(var i = 0; i < childNodes.length; i++) 
		promises.push(PINE.grow(childNodes[i], opType))
	
	return SyncPromise.all(promises);
}







/**********************************
*	 	<>DEBUGGING
**********************************/

//<>LOG

// U.showLog["all"] = true;  //
// U.showLog["needle"] = true; //
// U.showLog["permeate"] = true;
// U.showLog["pnv"] = true;
// U.showLog["initiate"] = true;
// U.showLog["run"] = true;
// U.showLog["sprout"] = true;  //
// U.showLog["pinefunc"] = true;  //
// U.showLog["opFunc"] = true;  //		
// U.showLog["async"] = true;
// U.showLog["FNS"] = true;

U.showLog = [];
U.observeLog = [];
var LOG = function()  {
	var logType = arguments[0] || "all";

	// console.log(logType);
	if (U.showLog[logType]){

		var callerLine = new Error().stack.split('\n');

		var line = logType+"::"
		line += callerLine[1].match(/([^\/])+?$/g)[0];

		if(callerLine[2]) {
			line += "....";
			line += callerLine[2].match(/([^\/])+?$/g)[0];
		}
		
		U.log("light", line);

		var args = [];

		for(var ar = 1; ar < arguments.length; ar++)
			args[ar-1] = arguments[ar];

		console.log.apply(console, args);
	}

	if (U.observeLog[logType]) {
		//output for event listeners
		var fns = PINE.eventListeners[ev.logUpdate];
			//
		if(fns) {
			var out = {};
			out.type = logType;
			out.text = '';

			for (var i = 1; i < arguments.length; i++)
				out.text += arguments[i];

			for(var i in fns)
				fns[i](out);	
		}
	}
}


PINE.debug = {};
PINE.debug.logErr = true;
PINE.debug.disableLOG = false;
PINE.debug.alertErr = false;
PINE.debug.on = true;
PINE.debug.showUnusedNeedles = true;
PINE.debug.showRunningAsyncs = true;
PINE.debug.showUnmetNeeds = true;

PINE.err = function(whatevers_the_problem) { //?
	if(PINE.debug.logErr)  {

		var args = [];
		var showStack = true;
		var labelPine = true;

		for(var ar in arguments) {
			if(ar == 0 && typeof arguments[ar] == "string") {
				if(arguments[ar].indexOf("nostack") != -1)
			 		showStack = false;
			 	if(arguments[ar].indexOf("notpine") != -1)
			 		labelPine = false;

			 	if(labelPine && showStack)
			 		args.push(arguments[ar]);
			}
			else	
				args.push(arguments[ar]);
		}
		
		if(labelPine)
			args.unshift("PINE error: ");
		args.unshift("error");

		if(showStack) {
			var stack = {};
			stack.lines = [];
			var errorStack = new Error().stack.split('\n');
			for(var i in errorStack) {
				var shortened = errorStack[i].match(/(\/)?([^\/]*?\/)?([^\/]+?)$/g);
				stack.lines[i] = shortened && shortened.length ? shortened[0] : errorStack[i];
			}

			var badLine = stack.lines[1];


			U.log("light", badLine, stack);
		}
		

		U.log.apply(this, args)
		// console.log(new Error());
	}
	if(PINE.debug.alertErr)  {
		alert("PINE error: "+whatevers_the_problem);
	}
}











PINE.debug.init = function()  {

	if(PINE.debug.disableLOG)
		LOG = function() {}
	
	if(PINE.debug.on) {
		PINE.ready(PINE.debug.logAnalysis);
		setTimeout(function(){
			PINE.debug.logAsyncIssues("4s")}, 4000)	
		setTimeout(function(){
			PINE.debug.logAsyncIssues("10s")}, 10000)		
	}

	LOG("overview", "Debugging Tools Initialized");	
}





PINE.debug.logAnalysis = function() {

	var output = "to stop seeing all debuging messages, set PINE.debugOn = false"; 
	U.log("info", output);

	if(PINE.showUnusedNeedles) {
			//
		var unusedNeedles = "";
		for(var key in PINE.needles)  {
			if(PINE.needles[key].uses == 0) {
				if(unusedNeedles != "")
					unusedNeedles += ", ";

				unusedNeedles += "\""+key+"\"";
			}
		}

		if(unusedNeedles != "") {
			var output = "Unused Needles found at:\n";
			output += unusedNeedles + "\n";
			output += "use PINE.disable(["+unusedNeedles+"]) if you have no intention of using these needles\n";
			output += "to stop seeing this message, set PINE.showUnusedNeedles = false";

			U.log("info", output);
		}
		else {
			
			U.log("success", "All needles used at least once.  Good job!");	
		}
	}

	
}



PINE.debug.logAsyncIssues = function(timeSinceBegin) {
	if(PINE.debug.showRunningAsyncs) {
		if(PINE.NEEDLES.runningInits.length) {
			PINE.err(timeSinceBegin+ "since start: Unterminated async functions at", PINE.NEEDLES.runningInits);
		}
	}

	if(PINE.debug.showUnmetNeeds && PINE.unmetNeeds.length) {
		PINE.err(timeSinceBegin+" since start: Unmet Needs", PINE.unmetNeeds);
	}
}


















/**********************************
*	 	PINE UTILITIES
*	shall some day be replaced by 
*  native functions I hope
**********************************/

document.addEventListener("DOMContentLoaded", function() {
	PINE.signalNeedMet("DOMReady");
});


U.domReady = U.docReady = function(callback) {
	PINE.waitForNeed("DOMReady", callback);
}


U.get = function(start, keyArrayOrString, bracketsCase)  {
	return U.getnit(start, keyArrayOrString, undefined, bracketsCase);
}

U.init = function(start, keyArrayOrString, init, bracketsCase)  {
	return U.getnit(start, keyArrayOrString, init, bracketsCase);
}

U.set = function(start, keyArrayOrString, init, bracketsCase)  {
	return U.getnit(start, keyArrayOrString, init, bracketsCase, true);
}


U.assertKey = U.assertArray = U.assertVar = function() {
	alert("USE u.get or u.init!!");
	PINE.err("USE u.get or u.init!!");
}




U.stringToVariableLayers = function(keyString, rootLess) {
	if(keyString === undefined)
		return;

	if(keyString.charAt(0) == '.')
		keyString = keyString.substr(1);

	// if(keyString.charAt(0) == '[' && keyString.charAt(keyString.length-1) == ']')
	// 	keyString = keyString.substr(1, keyString.length-2);


	var keyArray = [];
	var lastStop = 0;
	var openBrackets = 0;

	//go through string splitting at 0 depth end brackets (ie [[this]] [[notthis])
	//also split at dots
	//eg. exam.tests[lala.go["hey"]] == ["exam", "tests", "[lala.go['hey']]"];
	//eg. test['[test]'] == ["test", "['test']"]
	for(var c = 0; c < keyString.length; c++) {
		var char = keyString.charAt(c);

		if(char == '[') { 
			if(openBrackets == 0 && c != 0) {
				keyArray.push(keyString.substring(lastStop, c));
				lastStop = c;	
			}
			openBrackets++; 
		}
		else if(char == ']') {  openBrackets--;  }

		else if(openBrackets == 0 && char == '.') {
			keyArray.push(keyString.substring(lastStop, c));
			lastStop = c+1;	
		}
	}
	keyArray.push(keyString.substring(lastStop));




	var out = [];

	for(var i in keyArray) {
		var key = keyArray[i];
		var rootLessBracketCase = (i == 0 && rootLess == true); 
		if(!rootLessBracketCase && key.charAt(0) == '[') {
			key = key.substr(1, key.length-2);
			out.push(U.stringToVariableLayers(key));
		}
		
		else
			out.push(key);
	}

	return out;
}



//mix between get and init.
U.getnit = function(start, keyArrayOrString, init, bracketsCase, forceSet)  {
		//
	var pos = start;

	var keyArray;
	if(typeof keyArrayOrString == "string")
		keyArray = U.stringToVariableLayers(keyArrayOrString);
	else
		keyArray = keyArrayOrString;

	//there should be a starting point
	if(start && keyArray) {
			//
		
		for(var i in keyArray)  {
			var key = keyArray[i];

			if(typeof key == "object") {
				if(bracketsCase)
					key = bracketsCase(key);

				else
					key = getnit(window, key);
			}
			
			var atEnd = i >= keyArray.length - 1;

			if(pos[key] === undefined) {
				if(init === undefined)
					return undefined;

				else if(!atEnd)
					pos[key] = {};

				else pos[key] = init;
			}
			else if(forceSet && atEnd)
				pos[key] = init;

			pos = pos[key];
		}
	}

	return pos;
}







U.initArray = function(val, size)  {
	var out = [];
	for(var i = 0; i < size; i++) {
		out[i] = val;
	}
	return out;
}

U.nodeListToArray = function(nodeList) {
	var out = [];
	for(var i = 0; i < nodeList.length; i++) {
		out.push(nodeList[i]);
	}
	return out;
}


U.removeFromArray = function(val, array) {
	if(array == undefined)
		return PINE.err("array not defined ", val);

	var target = array.indexOf(val);

	if(target != -1)
		array.splice(target, 1);

	return target != -1;
}


U.Ajax = {};
U.Ajax.send = function(getOrPost, url, dataType, data) {
	return new SyncPromise( function(resolve, reject) {
		var request = new XMLHttpRequest();

		if(getOrPost == "GET") {
			request.responseType = dataType || "text";
			request.open("GET", url);	
		}
		else {//getOrPost == "POST"
			request.open("POST", url);	
			// request.setRequestHeader('Content-type', dataType)
		}


		request.onload = function() {
			if ((getOrPost == "GET" && (request.status >= 200 && request.status < 400))
				|| getOrPost=="POST") {
				LOG("ajax", request.status+" "+url, request);

			    resolve(request);			    

			} else {
			    request.onerror();
			}
		};

		request.onerror = function(response) {
			console.log(response);
			console.log(request);
			var err = "include src '"+url+"' does not exist";
		  	PINE.err(err, data)
		  	reject(err)
		};

		try {
			request.send(data);	
		}
		catch(e) {
			var err = "NS_ERROR_DOM_BAD_URI: Access to restricted URI '"+url+"' denied";
			PINE.err(err, data)
		  	reject(err)
		}


	});
}

U.Ajax.get = function(url, responseType) {
	return U.Ajax.send("GET", url, responseType);
}

U.Ajax.post = function(url, contentType, data) {
	return U.Ajax.send("POST", url, contentType, data);
}





U.helpfulEval = function(evalMe, filename) {
	
}


U.ranScripts = [];
U.ranScriptsNextId = 0;
// U.runScriptMode = "debuggable";
// U.runScriptMode = U.runScriptMode || "fast";


U.initScriptMode = function() {
	var	file = new Blob(["test"], {type: "text/javascript"});
    var url = URL.createObjectURL(file) + "#test?test";

    if(U.runScriptMode !== undefined)
    	return SyncPromise.resolved();

    else return U.Ajax.get(url).syncThen(function() {
    	U.runScriptMode = "debuggable";
    }).catch(function() {
    	PINE.err("switching to eval mode");
    	U.runScriptMode = "fast";
    });
}

U.runScript = function(scriptText, appendTo, src) {
	// console.log(scriptText);
	// var scriptText = scriptText + ' ';

	return new SyncPromise( function(resolve) {
		var id = U.ranScriptsNextId++;
		
		var ranScript = {};
		ranScript.resolve = resolve;
		U.ranScripts[id] = ranScript;

		scriptText = scriptText + "\nU.ranScripts["+id+"].resolve()";

		// console.log(scriptText);

		if(U.runScriptMode == "debuggable") {
			var	file = new Blob([scriptText], {type: "text/javascript"});
			var url = URL.createObjectURL(file);

			var script = document.createElement("script");
		    script.src = url+"#"+src+"?"+src;
		    script.type = "text/javascript";

			appendTo = appendTo || document.head;
			appendTo.appendChild(script);
		}

		else if(U.runScriptMode == "fast") {
			try {
				console.log("trying eval for "+src);
				eval(scriptText);
			}
			catch(e) {
				var lineNumber = e.lineNumber ? e.lineNumber : -1;
				var errorOut = {};

				errorOut.lines = scriptText.split('\n');
				var line = errorOut.lines[lineNumber-1];

				PINE.err("eval error in file "+src+" line: "+lineNumber+" of script: \n"+line, errorOut);
			}
		}
		else PINE.err("U.runScriptMode must be either 'fast' or 'debuggable'");

	});
}



/****
*	Console colors shared by SeriousJoker
*	http://stackoverflow.com/a/25042340/4808079
*/

U.log = function() {
    var color = arguments[0] || "black";
    var bgc = "Transparent";
    switch (color) {
        case "success":  color = "Yellow";      			bgc = "Green";      	break;
        case "info":     color = "Black"; 	   				bgc = "Orange";       	break;
        case "error":    color = "#D33";   					bgc = "#222";          break;
        case "light":    color = "rgba(150,150,150,0.3)";     						break;
        default: color = color;
    }
    
    var coloring = "color:" + color + "; background-color: " + bgc + ";";

    var args = [];

    var insertAt = 0;

    if(typeof arguments[1] == "string")  {
    	args[0] = "%c"+arguments[1];
    	args[1] = coloring;
    }
    else {
    	args[insertAt] = arguments[1];
    }


    for(var ar = 2; ar < arguments.length; ar++) {
    	if(insertAt == 0) {
	    	if(typeof arguments[ar] == "string") {
	    		args[0] += arguments[ar]
	    	}
	    	else {
	    		insertAt = 2;
	    	}
	    }

	    if(insertAt != 0) {
	    	args[insertAt] = arguments[ar]
	    	insertAt++;
	    }
    }
    
    console.log.apply(console, args);
}



U.cookie = U.setCookie = U.getCookie = U.deleteCookie = function() {
	alert("DON'T USE COOKIES, USE LOCAL STORAGE");
	PINE.err("cookies no longer supported");
}



U.getHtmlQuery = U.getHttpArg = function(varName, url){
	if(url === undefined)
		url = window.location.href;
   	// if(varName=(new RegExp('[?&]'+encodeURIComponent(varName)+'=([^&]*)')).exec(url))
    //     return decodeURIComponent(varName[1]);
    if(varName = (new RegExp('[?&]'+varName+'=([^&]*)')).exec(url))
        return varName[1];

    else return undefined;
}




/***********
*
*	Similar to promises, but only asynchronous when necessary
*
***********/


var SyncPromise = function(fn) {
	var syncable = this;
	syncable.state = "pending";
	syncable.value;

	var wrappedFn = function(resolve, reject) {
		var fakeResolve = function(val) {
			syncable.value = val;
			syncable.state = "fulfilled";
			resolve(val);
		}

		fn(fakeResolve, reject);
	}

	var out = new Promise(wrappedFn);
	out.syncable = syncable;
	return out;
}

SyncPromise.resolved = function(result) {
	return new SyncPromise(function(resolve) { resolve(result); });
}

SyncPromise.all = function(promises) {
	for(var i = 0; i < promises.length; i++) {
		if(promises[i].syncable && promises[i].syncable.state == "fulfilled") {
			promises.splice(i, 1);
			i--;
		}
		// else console.log("syncable not fulfilled" + promises[i].syncable.state)
	}

	if(promises.length == 0)
		return SyncPromise.resolved();

	else
		return new SyncPromise(function(resolve) { Promise.all(promises).then(resolve); });
}


//TODO make into ".then"  create ".forceAsyncThen"
// SyncPromise.prototype.then = 
Promise.prototype.syncThen = function (nextFn) {
	if(this.syncable && this.syncable.state == "fulfilled") {
			//
		if(nextFn instanceof Promise) {
			return nextFn;
		}
		else if(typeof nextFn == "function") {
			var val = this.syncable.value;
			var out = nextFn(val);
			return new SyncPromise(function(resolve) { resolve(out); });
		}
		else {
			PINE.err("nextFn is not a function or promise", nextFn);
		}
	}

	else {
		// console.log("default promise");
		return this.then(nextFn);
	}
}

SyncPromise.prototype.forceAsyncThen = Promise.prototype.then;











var El = PINE.UTILITIES.ELEMENT = function(domNode) {
	return new PINE.class.ElementHelper(domNode);
}

El.byID = El.byId = function(id) {
	return document.getElementById(id);
}

El.byTag = function(domNode, tag) {
	return domNode.getElementsByTagName(tag);
}

El.firstOfTag = function(domNode, tag) {
	if(tag == undefined) {
		tag = domNode;
		domNode = undefined;
	}

	if(domNode == undefined)
		domNode = document.body;
		// PINE.err("can not get by tag from undefined domNode", domNode, className);
	var result = El.byTag(domNode, tag);
	if(result.length)
		return result[0];
	else
		return undefined;
}

El.firstOfClass = function(domNode, className) {
	if(domNode === undefined)
		PINE.err("can not get by class from undefined domNode", domNode, className);
	var result = domNode.getElementsByClassName(className);
	if(result.length)
		return result[0];
	else
		return undefined;
}

El.relativeMatch = function(target, selector, root) {
	var tmp_used = false;
	if(root.id == '')
	   tmp_used = root.id = "tmp_match_id";

	var doesMatch = target.matches("#"+root.id+selector);
	if(tmp_used !== false)
	    root.id = '';

	return doesMatch;
}

El.queryChildren = function(root, keyword, limit) {
	return El.cssQuery(root, "> "+keyword, limit);
	// var out = [];
	// for(var i in root.children)
}

El.removedChildren = function(domNode) {
	while(domNode.hasChildren())
		domNode.lastChild.remove();
}

El.cssQuery = function(root, selector, limit) {
	if(limit === 0)
		return [];

	selector = selector.trim();
	if(selector.charAt(0) == ">")
		selector = ":scope "+selector;

	while(selector.charAt(0) == "~") {
		root = root.parentNode;
		// console.log(selector);
		selector = selector.slice(1);
	}

	if(selector == '')
		return [root];

	else if(limit == 1)
		return [root.querySelector(selector)];

	else
		return root.querySelectorAll(selector);
}


El.firstsOfKey = function(root, keyword, skipOnce)  {
	if(skipOnce === false && PINE.keyApplies(keyword, root)) {
		return root;
	}

	var out = [];

	var branches = root.childNodes;
	for(var i = 0; branches && i < branches.length; i++)  {
		var matches = El.firstsOfKey(branches[i], keyword, false);
		
		if(matches != null)
			out = out.concat(matches);
	}

	return (out.length > 0) ? out : null;
}



El.attr = function(domNode, name, value) {
	if(typeof domNode == "string")
		domNode = El.byId(domNode);

	if(domNode && domNode.attributes) {
		var target = domNode.attributes[name] || domNode.attributes[name.toLowerCase()];

		if(target == null){
			if(value === undefined)
				return undefined;
			else {
				domNode.setAttribute(name, value);
			}
		}
		else {
			if(value === undefined)
				return target.value;
			else
				target.value = value;
		}
	}
	else return undefined;
}



// El.on = function(domNode, eventName, fn) {
// 	domNode.addEventListener(eventName, fn);
// }

El.waitForDisplay = function(domNode) {
	if(domNode === undefined)
		PINE.err("can not wait for display of undefined");

	if(El.waitForDisplayInited == false)
		El.initWaitForDisplay();

	return new SyncPromise(function(resolve, reject) {
		var inWindow = El.getRootNode(domNode).tagName == "HTML";
		var isDisplayed = El.getStyle(domNode, "display") != "none";

		console.log(inWindow, isDisplayed);

		if(inWindow && isDisplayed) {
			resolve();
			return;
		}
		else {
			domNode.classList.add("watch_for_display");
		 	var onStart = function(event) {
			    if (event.animationName == 'watch_for_display_inserted' && event.target == domNode) {
			    	document.removeEventListener('animationstart', onStart);
			    	resolve();
			    }
			}
		 	document.addEventListener('animationstart', onStart);
		}
	});
}

El.onBlur = function(domNode, fn) {
	document.body.addEventListener("mousedown", function(event) {
		if(domNode == event.target || domNode.contains(event.target)) 
			domNode.__pine__.focused = true;
		
		else if(domNode.__pine__.focused === true) {
			domNode.__pine__.focused = false;
			fn();
		}
	});
}

El.makeFocusable = function(domNode, tabIndex) {
	tabIndex = tabIndex || "0";
	El.attr(domNode, "tabIndex", tabIndex);
}


//unfortunate hack used for El.waitForDisplay().  
//Very useful for any elements which make use of their dimensions on screen.
El.waitForDisplayInited = false;
El.initWaitForDisplay = function() {
	El.waitForDisplayInited = true;
	var display_watch_style = document.createElement("style");
	display_watch_style.textContent = "@keyframes watch_for_display_inserted { from { z-index: 1; } to { z-index: 1; } }"
		+	".watch_for_display { animation-duration: 0.001s; animation-name: watch_for_display_inserted; }";
	document.body.appendChild(display_watch_style);
}


	


El.getRootNode = function(branch, matchCase) {
	var out = branch;
	matchCase = matchCase || "HTML";
	while(out.parentNode && out.matches(matchCase) == false && out.tagName !== "HTML")
		out = out.parentNode;

	return out;
}

El.getSharedRoot = function(node1, node2) {
	var out = undefined;
	for(var ptr1 = node1; ptr1 && out == undefined; ptr1 = ptr1.parentNode) {
			//
		for(var ptr2 = node2; ptr2 && out == undefined; ptr2 = ptr2.parentNode) {
				//
			// console.log(ptr1, " ?==", ptr2);
			if(ptr1 === ptr2 && ptr1 !== undefined)
				out = ptr1;
		}
	}
	return out;
}




El.attArg = function(domNode, attNames, type, defaultVal, defaultAttVal) {

	var out;
	type = type ? type.toLowerCase() : undefined;

	if(typeof attNames == "string")
		out = El.attr(domNode, attNames);

	else if (typeof attNames == "object") {
		for (var i = 0; i < attNames.length && out == undefined; i++){
			out = El.attr(domNode, attNames[i]);
		}
	}

	if(type == "exists")
		return out != undefined;


	if(out === '') 
		out = defaultAttVal;
		
	if(out === undefined) {
		if(typeof defaultVal == "function")
			return defaultVal(domNode);

		else return defaultVal;
	}
	
	
	if (type == "string" || type == undefined)
		return out;

	else if (type == "int") 
		return parseInt(out);

	else if (type == "id")
		return El.byId(out);

	else if (type == "pvar") {
		if(El.pvar != undefined)
			return El.pvar(domNode, out);
		else
			return U.get(window, out);
	}

	else if (type == "tag")
		return El.byTag(domNode, out);

	else if (type == "tagFirst")
		return El.firstOfTag(domNode, out);

	else if (type == "selector" || type == "element")
		return El.cssQuery(domNode, out);

	else if (type == "float" || type == "double" || type == "number")
		return parseFloat(out);

	else if (type == "boolean")
		return out == "true" ? true : out == "false" ? false : undefined;

	return out;
}


El.makeSizeCalculatable = function(domNode) {
	var positioning = El.getStyle(domNode, "position");
	
	if(positioning == undefined || positioning == 'static')
		domNode.style.position = "relative";
}


El.setSize = function(domNode, width, height) {
	domNode.style.width = width+"px";
	domNode.style.height = height+"px";
}

El.windowOffset = function(target) {
	var out = {};
		//
  	var bounds = target.getBoundingClientRect();
  	out.left = bounds.left + window.scrollX;
    out.top = bounds.top + window.scrollY;

    return out;
}

El.relativePos = function(ofMe, toMe) {
	var spaceBounds = ofMe.getBoundingClientRect();
	var itemBounds = toMe.getBoundingClientRect();

	var x = itemBounds.left - spaceBounds.left;
	var y = itemBounds.top - spaceBounds.top;

	return {x: x, y: y};
}

El.getPxCoordinate = function(domNode, posString) {
	var dimensions = posString.match(/[\S]+/g);
	var out = [];

	for(var i = 0; i < dimensions.length; i++) {
			//
		var dim = dimensions[i];
		if(dim.endsWith('px')) {
			out[i] = parseFloat(dim.replace('px', ''));
		}
		else {
			var size = (i == 0) ? domNode.offsetWidth : domNode.offsetHeight;

			var multiple;
			if(dim.endsWith('%')) 
				multiple = parseFloat(dim.replace('%', ''))/100.0;

			if(multiple !== undefined)
				out[i] = size * multiple;
		}
	}

	return out;
}


El.overlap = function(el1, el2) {
		//
	var bounds1 = el1.getBoundingClientRect();
	var bounds2 = el2.getBoundingClientRect();

	var firstIstLeftmost = (bounds1.left <= bounds2.left);
	var leftest = firstIstLeftmost ? bounds1 : bounds2;
	var rightest = firstIstLeftmost ? bounds2 : bounds1;

	if(leftest.right > rightest.left) {
			//
		var firstIsTopmost = (bounds1.top <= bounds2.top);
		var topest = firstIsTopmost ? bounds1 : bounds2;
		var bottomest = firstIsTopmost ? bounds2 : bounds1;

		return topest.bottom > bottomest.top;
	}
	else return false;
}



El.getSetStyle = function (domNode, styleProp, value) {
    if(!domNode)
    	PINE.err("can not get style of undefined domNode", domNode, styleProp);

    if(domNode.currentStyle) {
    	if(value !== undefined)
    		domNode.currentStyle[styleProp] = value

    	else return domNode.currentStyle[styleProp];
    } 
    else if (window.getComputedStyle) {
    	var styling = document.defaultView.getComputedStyle(domNode, null);

    	if(value !== undefined)
        	styling.setProperty(styleProp, value)

        else return styling.getPropertyValue(styleProp);

    }
    else PINE.err("can not get style of domNode", domNode, styleProp);
}


El.getStyle = function (domNode, styleProp) {
    return El.getSetStyle(domNode, styleProp);
}

El.setStyle = function (domNode, styleProp, value) {
	value = value || "";
    El.getSetStyle(domNode, styleProp, value);
}


El.getStyleVar = function(domNode, varName) {
	domNode = domNode || document.body;
	varName = "--"+varName;
	return El.getStyle(domNode, varName)
}

El.setStyleVar = function(domNode, varName, value) {
	domNode = domNode || document.body;
	varName = "--"+varName;
	El.setStyle(domNode, varName, value)
}


El.cloneAndInit = function(domNode, goDeep) {
	var out = domNode.cloneNode(goDeep);
	PINE.initiate(out);
	return out;
}




El.resizeSensorNode = undefined;
El.initResizeNode = function() {
	var fillParent = "display: block; position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; z-index: -1; visibility: hidden;";
	var triggerStyle = "position: absolute; left: 0; top: 0; transition: 0s;";

	var resizeSensor = El.resizeSensorNode = document.createElement("resizeSensor");
	resizeSensor.style = fillParent;

	var expandSensor = document.createElement("div");
	expandSensor.style = fillParent;
	resizeSensor.appendChild(expandSensor);

	var trigger = document.createElement("div");
	trigger.style = triggerStyle;
	expandSensor.appendChild(trigger);

	var shrinkSensor = expandSensor.cloneNode(true);
	shrinkSensor.firstChild.style = triggerStyle + " width: 200%; height: 200%";
	resizeSensor.appendChild(shrinkSensor);
}


El.onSizeChange = function(domNode, fn) {
    if (!domNode) return;
    if (domNode.resizeListeners) {
        domNode.resizeListeners.push(fn);
        return;
    }

    domNode.resizeListeners = [];
    domNode.resizeListeners.push(fn);

    if(El.resizeSensorNode == undefined)
    	El.initResizeNode();

    domNode.resizeSensor = El.resizeSensorNode.cloneNode(true);
    domNode.appendChild(domNode.resizeSensor);

    var expand = domNode.resizeSensor.firstChild;
    var expandTrigger = expand.firstChild;
    var shrink = domNode.resizeSensor.childNodes[1];

    var reset = function() {
        expandTrigger.style.width = '100000px';
        expandTrigger.style.height = '100000px';

        expand.scrollLeft = 100000;
        expand.scrollTop = 100000;

        shrink.scrollLeft = 100000;
        shrink.scrollTop = 100000;
    };

    reset();

	var hasChanged, frameRequest, newWidth, newHeight;
    var lastWidth = domNode.offsetWidth;
    var lastHeight = domNode.offsetHeight;


    var onResized = function() {
        frameRequest = undefined;

        if (!hasChanged) return;

        lastWidth = newWidth;
        lastHeight = newHeight;

        var listeners = domNode.resizeListeners;
        for(var i = 0; listeners && i < listeners.length; i++) 
        	listeners[i]();
    };

    var onScroll = function() {
        newWidth = domNode.offsetWidth;
        newHeight = domNode.offsetHeight;
        hasChanged = newWidth != lastWidth || newHeight != lastHeight;

        if (hasChanged && !frameRequest) {
            frameRequest = requestAnimationFrame(onResized);
        }

        reset();
    };


   	expand.addEventListener("scroll", onScroll);
   	shrink.addEventListener("scroll", onScroll);
}





var ElementHelper = PINE.class.ElementHelper = function(domNode) {
	if(typeof domNode == "string")
		this.domNode = El.byID(domNode);

	else
		this.domNode = domNode;
}
ElementHelper.prototype.byTag = function(tag) {
	return El.byTag(this.domNode, tag);
}
ElementHelper.prototype.firstOfTag = function(tag) {
	return El.firstOfTag(this.domNode, tag);
}

ElementHelper.prototype.queryChildren = function(keyword, limit) {
	return El.cssQuery(this.domNode, "> "+keyword, limit);
}

ElementHelper.prototype.cssQuery = function(selector, limit) {
	return El.cssQuery(this.domNode, keyword, limit);
}

ElementHelper.prototype.firstsOfKey = function(keyword, skipOnce)  {
	return El.firstsOfKey(this.domNode, keyword, skipOnce);
}

ElementHelper.prototype.attr = function(name, value) {
	return El.attr(this.domNode, name, value); 
}

ElementHelper.prototype.waitForDisplay = function() {
	return El.waitForDisplay(this.domNode);
}

ElementHelper.prototype.onBlur = function(fn) {
	return El.onBlur(this.domNode, fn);
}

ElementHelper.prototype.getRootNode = function() {
	return El.getRootNode(this.domNode);	
}

ElementHelper.prototype.makeSizeCalculatable = function() {
	return El.makeSizeCalculatable(this.domNode);	
}

ElementHelper.prototype.relativePos = function(toMe) {
	return El.relativePos(this.domNode, toMe);	
}

ElementHelper.prototype.overlap = function(withMe) {
	return El.overlap(this.domNode, withMe);	
}

ElementHelper.prototype.getStyle = function(styleProp) {
	return El.getStyle(this.domNode, styleProp);	
}

ElementHelper.prototype.cloneAndInit = function(goDeep) {
	return El.cloneAndInit(this.domNode, doDeep);	
}






U.docReady(PINE.run);




// PINE.createNeedle("nodeChangeDispatcher", function(dispatcher) {
// 	dispatcher.setMatchCases('*');

// 	dispatcher.addOpFn(PINE.ops.INIT, function() {
// 		var domNode = this.domNode;
// 	})
// });






