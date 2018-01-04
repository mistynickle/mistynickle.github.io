/******************************************
*          ____   _   _   _   ____
*         |    \ | | | \ | | |  __|
*         |  = | | | |  \| | | |__
*         |  __/ | | | \   | |  __|
*         | |    | | | |\  | | |__ 
*         |_|    |_| |_| \_| |____|
*
*                 4.2       /\
*          by: Seph Reed   X  X
*                           \/
*
********************************************/


"use strict"



var INC = PINE.Include = {};
INC.includeBank = {};
INC.srcCache = {};
INC.cacheSettings = {};

INC.BYROOT = "byroot";    	//byroot will equate [place.com, place.com?hat=fez, and place.com?skill=lazers]
INC.NORMAL = "normal";		//normal will let the browser figure out all equally cachable pages
INC.default = INC.default || INC.NORMAL;

INC.defaultChangeSrcTarget = undefined;


PINE.Include.setCachingDefault = function(i_default) {
	INC.default = i_default;
}

PINE.Include.setUrlCachingStyle = function(url, cacheOp) {
	INC.cacheSettings[url] = cacheOp;
}


PINE.Include.setDefaultChangeSrcTarget = function(target) {
	INC.defaultChangeSrcTarget = target;
}


PINE("[defaultChangeSrcTarget]", function() {
	var job = this;
	if(INC.defaultChangeSrcTarget) {
		PINE.err("default change src target already set to ", INC.defaultChangeSrcTarget, 
			" use PINE.Include.setDefaultChangeSrcTarget() if you want to change it mid site execution")
	}

	else INC.setDefaultChangeSrcTarget(job.domNode);
})





//TODO remove caching.


INC.get = function(url, responseType) {
	LOG("overview", "PINE_Include: Requesting url "+url+"...");	

	//return a promise
	return new SyncPromise( function(resolve, reject) {

		//get the base url. check the rules for it
		var noQueryUrl = url.replace(/\?.*/g, '');
		var cacheOp = INC.cacheSettings[noQueryUrl] || INC.default;

		if(cacheOp == INC.BYROOT)
			url = noQueryUrl;


		//get the cache, if none is set create a cache
		//caches contain a resolve and reject queue for cases where mulitple functions make a promise for the url
		var cache = INC.srcCache[url];
		if(cache == null)  {

			cache = INC.srcCache[url] = {};
				//
			cache.resolveQueue = [];
			cache.rejectQueue = [];
			cache.complete = false;

			var success = function(result) {
				LOG("overview", "PINE_Include: INC.get '"+url+"' Success!");	

				cache.response = result.response;
				cache.complete = true;

				resolve(cache.response);

				for(var i in cache.resolveQueue)
			    	cache.resolveQueue[i](cache.response);

				cache.resolveQueue = [];
			}
			var failure = function(result) {
				reject(result)

			  	for(var i in cache.rejectQueue)
			    	cache.rejectQueue[i](result);

				cache.rejectQueue = [];
			}


			U.Ajax.get(url).syncThen(success, failure)
		}			

		//if the url has been requested, but not yet resolved
		else if(cache.complete == false) {
			cache.resolveQueue.push(resolve);
			cache.rejectQueue.push(reject);
		}

		//the url has been included and resolved
		else resolve(cache.response);
	});


}





/****************
*    include
***************/


PINE.createNeedle("include", function(include) {

	include.addAttArg("src", "src", "string");

	include.FNS.changeSrc = function(src) {
		this.domNode.setAttribute("src", src);
		return this.FNS.update();
	}

	include.FNS.update = function() {
		var job = this;
		var domNode = job.domNode;

		var url = this.attArg.src;

		if(url) {
			if(url == "nosrc") 
				return SyncPromise.resolved();
			
			
			return INC.get(url).syncThen(function(response) {

				if(url.indexOf(".html") != -1) {
					domNode.innerHTML = response;

					if(El.attr(domNode, "ENDPINE") === undefined) {
						return U.evalElementScripts(domNode, url).syncThen(function(){
							return PINE.updateAt(domNode);
						});
					}
				}

				else if(url.indexOf(".css") != -1) 
					domNode.innerHTML = "<style>"+response+"</style>"
				
				else PINE.err("file is neither .html or .css");
				

				return PINE.updateAt(domNode);
			});	
			
		} 
		else {
			PINE.err("include src for "+domNode+" in not set.  Set to 'nosrc' if this is intentional");
			return SyncPromise.resolved();
		}
	}

	include.addInitFn({
		isAsync : true,
		fn: function(args) {
			this.FNS.update().syncThen(args.resolve);
		}
	});

});

// p_include.update = function(initMe, callback) {

// 	var url = El.attr(initMe, "src");
		
// 	if(url) {
// 		if(url == "nosrc") {
// 			callback();
// 			return;
// 		}
		
		
// 		INC.get(url).then(function(response) {

// 			if(url.indexOf(".html") != -1) {
// 				initMe.innerHTML = response;

// 				if(El.attr(initMe, "ENDPINE") === undefined)
// 					U.evalElementScripts(initMe, url);
// 			}
// 			else if(url.indexOf(".css") != -1) {
// 				initMe.innerHTML = "<style>"+response+"</style>"
// 			}
// 			else {
// 				PINE.err("file is neither .html or .css");
// 			}


// 			callback ? callback() : null
// 		});	
		
// 	} else {
// 		PINE.err("include src for "+initMe+" in not set.  Set to 'nosrc' if this is intentional");
// 		callback();
// 	}
// }



// p_include.init = function(initMe, onComplete) {
// 	p_include.update(initMe, onComplete);

// 	PINE.addNodeFunction(initMe, "changeSrc", function(src, callback) {
// 		// callback = callback || function(){};
		
// 	});
// }







/****************
*   view
***************/

INC.VIEWS = {};


INC.View = function(url) {
	this.url = url;
	this.childNodes = [];
	this.PVARS = {};
}



var p_view = PINE.createNeedle("view", function(view) {

	view.addAttArg("url", "src", "string");

	view.FNS.updateView = function() {
		var job = this;
		var domNode = this.domNode;
		var url = job.attArg.url;
			
		if(url) {

			var currentUrl = job.currentUrl;

			if(url == currentUrl) return;
				//
			if(currentUrl != "unset") {

				var oldView = job.views[currentUrl];

				if(oldView === undefined) 
					oldView = job.views[currentUrl] = new INC.View(currentUrl);
				

				var moveMe;
				while (moveMe = domNode.lastChild)  {
					oldView.childNodes.push(moveMe)
					domNode.removeChild(moveMe);
				}

				oldView.PVARS = domNode.PVARS;
				domNode.PVARS = {};
			}

			job.currentUrl = url;

			var dispatch = function() {
				domNode.dispatchEvent(new CustomEvent("viewChange", {
					detail : {
						url : url
					},
					bubbles : true,
					cancelable : true
				}));
			}

			if(url != "nosrc"){
				var view = job.views[url];
					//
				if(view !== undefined) {
					var moveMe;
					while (moveMe = view.childNodes.pop())  {
						domNode.appendChild(moveMe);
					}

					domNode.PVARS = view.PVARS;
					view.PVARS = {};

					dispatch();
				}
				else {
						//
					return INC.get(url).syncThen(function(response) {
						view = job.views[url] = new INC.View(url);
							//
						if(url.indexOf(".html") != -1) {
							domNode.innerHTML = response;
							return U.evalElementScripts(domNode, url).syncThen(function(){
								dispatch();
								return PINE.updateAt(domNode);
							});
						}
						else if(url.indexOf(".css") != -1) {
							domNode.innerHTML = "<style>"+response+"</style>"
						}

						else PINE.err("file is neither .html or .css");

						dispatch();
						return PINE.updateAt(domNode);
					});
				}
			}
		
		} 
		else PINE.err("include src for "+initMe+" in not set.  Set to 'nosrc' if this is intentional");

		return SyncPromise.resolved();
	}

	view.FNS.changeSrc = function(src) {
		this.domNode.setAttribute("src", src);
		return this.FNS.updateView();
	}

	view.FNS.dropView = function(url) {
		delete this.views[url];
	}


	view.FNS.dropAllViews = function(includeCurrent) {
		var domNode = this.domNode;

		if(includeCurrent) {
			domNode.setAttribute("src", "nosrc");
			this.FNS.updateView()
		}

		this.views = {};
	}


	view.FNS.dropViewsContaining = function(url) {
		var domNode = this.domNode;
		var views = this.views;
		for(var key in views) {
			if(key.indexOf(url) != -1)
				delete views[key];
		}
	}



	view.addInitFn({
		isAsync : true,
		fn: function(state, args) {
			var job = this;
			job.currentUrl = "unset";
			job.views = {};
			job.FNS.updateView().syncThen(args.complete);
		}
	});


});





/****************
*   changeSrc
***************/

PINE.createNeedle("[changeSrc]", function(change) {
	change.addAttArg("src", "changeSrc", "string");
	change.addAttArg("target", ["changeSrcTarget", "target"], "id");

	change.addInitFn( function() {
		var job = this;
		var initMe = job.domNode;

		initMe.addEventListener("click", function(event) {
			var target = job.attArg.target || INC.defaultChangeSrcTarget;
			if(target && target.FNS && target.FNS.changeSrc)
				target.FNS.changeSrc(job.attArg.src);
		});
	});
});






/****************
*   [backButton]
***************/


PINE("[backButton]", PINE.ops.GATHER, function(initMe, needle) {

	var target = El.attr(initMe, "backButton") || INC.defaultChangeSrcTarget;
	var domNode = document.getElementById(target);
	var backHistory = initMe._pine_.backHistory = [];

	if(domNode && domNode.FNS && domNode.FNS.changeSrc) {
		domNode.FNS.changeSrc.add("before", function(src) {

			var oldSrc = El.attr(domNode, "src");

			if(src == oldSrc) return;

			var goingBack = false;
			for(var ba in backHistory) {
				var item = backHistory[ba];
				if(item == src) {
					goingBack = true;
					while(ba < backHistory.length) {
						backHistory.pop();
					}
				}	
			}

			if(goingBack == false)
				backHistory.push(oldSrc);
			
			El.attr(initMe, "src", backHistory[backHistory.length-1]);
		});
	}
});









/****************
*    Utilities
***************/



U.evalElementScripts = function(initMe, url) {

	var injects = [];

	// console.log("evaling elementScripts")
	// var fakeLoc = {};
	// var search = url.match(/\?.*/g);
	// fakeLoc.search = search ? search[0] : "";
	// injects.push({var_name: "window.location", addMe: fakeLoc});

	var INCLUDED = {};
	INCLUDED.url = url;
	injects.push({var_name: "INCLUDED", addMe: INCLUDED});

	var scriptNodes = initMe.getElementsByTagName("script");

	var scripts = [];
	for(var sc = 0; sc < scriptNodes.length; sc++) {
		scripts[sc] = scriptNodes[sc].innerHTML;
	}

	var hack = U.hackScripts(scripts, injects);

	initMe.PVARS = hack.localVars;

	var promises = [];
	for(var sc in hack.scripts) {
		promises.push(U.runScript(hack.scripts[sc], undefined, url));
	}

	// console.log(promises);

	return SyncPromise.all(promises);
}





U.Context = function(script, type) {
	this.script = script;
	this.type = type;
	this.subContexts;
}

U.Context.TYPE = {};
U.Context.TYPE.STRING = "string";
U.Context.TYPE.COMMENT = "comment";
U.Context.TYPE.LOCAL = "local";
U.Context.TYPE.UNLOCAL = "unlocal";

U.Context.prototype.toString = function() {
	if(this.type == U.Context.TYPE.UNLOCAL) {
		var out = ""
		for(var su in this.subContexts) 
			out += this.subContexts[su].toString()
		
		return "{"+out+"}";
	}
	else return this.script;
}



U.parseScriptToContexts = function(script) {
	var contexts = [];

	var bracketDepth = 0;
	var lastCut = 0;
	for(var c = 0; c < script.length; c++) {
		var char = script.charAt(c);


		var atEnd = (c == script.length-1);
	
		if(char == "}") {
			bracketDepth--;

			if(bracketDepth == 0) {
				var scriptChunk = script.substring(lastCut, c+1);
				var context = new U.Context(scriptChunk, U.Context.TYPE.UNLOCAL);
				context.subContexts = U.parseScriptToContexts(scriptChunk.substring(1, scriptChunk.length-1));
				contexts.push(context);
				lastCut = c + 1;
			}
		}


		else if(char == "{" || atEnd) {
			if(bracketDepth == 0) {
				if(atEnd) c++;
				var scriptChunk = script.substring(lastCut, c);
				var context = new U.Context(scriptChunk);
				contexts.push(context);
				lastCut = c;
			}

			bracketDepth++;
		}
	}


	for (var co = 0; co < contexts.length; co++) {
		// console.log(contexts[co]);

		if(contexts[co].type === undefined) {
			var script = contexts.splice(co, 1)[0].script;

			var chunks = [];

			var exiting = false;
			var dubQuote = 0;
			var singQuote = 0;
			var comment = 0;

			var lastCut = 0;

			for(var c = 0; c < script.length; c++) {
				var char = script.charAt(c);
				var new_chunk = false;
				
				if(!exiting) {
					if(char == "\\") exiting = true;

					else if(char == "\"" && !singQuote) {
						new_chunk = true;
						dubQuote++;
					}

					else if(char == "\'" && !dubQuote) {
						new_chunk = true;
						singQuote++;
					}

					// else if(char == "/") {
					// 	if()
					// }

					var atEnd = (c == script.length-1);
					if(new_chunk || atEnd) {
						var scriptChunk, context;

						if(dubQuote > 1 || singQuote > 1) {
							scriptChunk = script.substring(lastCut, c+1);
							context = U.Context.TYPE.STRING;
						
							dubQuote = singQuote = 0;
							lastCut = c + 1;
						}
						else if(comment > 1) {
							scriptChunk = script.substring(lastCut, c);
							context = U.Context.TYPE.COMMENT;

							comment = false;
							lastCut = c;
						}
						else {
							if(atEnd) c++;
							scriptChunk = script.substring(lastCut, c);
								//
							// else scriptChunk = script.substring(lastCut, c);
							context = U.Context.TYPE.LOCAL;

							lastCut = c;
						}

						
						chunks.push(new U.Context(scriptChunk, context));
					}
				}
				else exiting = false;
				
			}


			for(var ch in chunks) {
				contexts.splice(co, 0, chunks[ch])
				co++;
			}
		}
	}


	return contexts;
}




U.hackScripts = function(scriptsArray, i_injects) {
	var injects = i_injects || [];

	var evalIndex = PINE.evals.length;
	PINE.evals[evalIndex] = {};
	var evalPrefix = "PINE.evals["+evalIndex+"].";

	if(i_injects !== undefined) {
		var injectReferences = PINE.evals[evalIndex]["__eval__"] = {};

		for(var i in injects) {
			var exitKey = injects[i].var_name.replace('.', '_');

			injectReferences[exitKey] = injects[i].addMe;
			injects[i].addMe = evalPrefix+"__eval__."+exitKey;
			
		}
	}



	var scriptContexts = []

	for(var sc in scriptsArray) {
		var contexts = scriptContexts[sc] = U.parseScriptToContexts(scriptsArray[sc]);

		for (var co in contexts) {
			if(contexts[co].type == U.Context.TYPE.LOCAL) {
				// var rex = /(var.+?(?=([;\n=]|$)))/g;

				//check for anything that starts with var or function(
				var rex = /(function +.+\()|(var.+?(?=([;\n=]|$)))/g;

				contexts[co].script = contexts[co].script.replace(rex, function(replaceMe, isFunc) {
					if(isFunc) {
						return replaceMe.replace(/function +\w*/g, function(relaceMe) {
							var var_name = relaceMe.replace(/function +/g, '');
							return "window[\""+var_name+"\"] = function";
						});
					}
					else {
						var var_name = replaceMe.replace(/var +| +$/g, '');
						var addMe = evalPrefix+var_name;
						// var rex = RegExp("([^\\.]|^)"+var_name+"(?! *:)");
						injects.push({ var_name : var_name, addMe : addMe});

						return addMe;
					}
				});
			}
		}
	}

	for(var i in injects) {
		injects[i].rex = RegExp("([^\\.\\w\\d]|^)"+injects[i].var_name+"(?!( *:|[\\w\\d]))", "g");
	}

	var scriptsOut = [];

	for(var sc in scriptContexts) {
		var contexts = scriptContexts[sc];

		U.injectVars(contexts, injects);

		var script = ""

		for (var co in contexts) {
			script += contexts[co].toString();
		}

		scriptsOut[sc] = script;
	}

	var out = {};
	out.scripts = scriptsOut;
	out.evalIndex = evalIndex;
	out.localVars = PINE.evals[evalIndex];


	return out;
}


U.injectVars = function(contexts, injects) {

	for(var co in contexts) {
		var con = contexts[co];
		if(con.type == U.Context.TYPE.LOCAL) {
			for(var i in injects) {
				var inj = injects[i]; 
				con.script = con.script.replace(inj.rex, function(replaceMe, prependChar){
					var out = inj.addMe;

					if(prependChar)
						out = prependChar + out;

					return out;
				});
			}
		}
		if(con.type == U.Context.TYPE.UNLOCAL) {
			U.injectVars(con.subContexts, injects)
		}
	}
}












