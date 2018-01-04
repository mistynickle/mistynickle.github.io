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


var pnv = PINE.pnv = {};



PINE.createNeedle("*", function() {
	this.addInitFn(function() {
		var initMe = this.domNode;
		for (var node = initMe.firstChild; node; node = node.nextSibling) {
			if(node.nodeName == "#text")  
				pnv.parseText(node);
		}

		pnv.parseAtts(initMe);	
	});
});






PINE.pnv.parseText = function(initMe)  {
	var text = initMe.data;

	var myRe = /{{.+?}}/g;
	var myArray;
	while ((myArray = myRe.exec(initMe.data)) !== null)
	{
		var indexOf = myRe.lastIndex - myArray[0].length;

		var preVarTextNode = initMe;
		var varTextNode = preVarTextNode.splitText(indexOf);
		var postVarTextNode = varTextNode.splitText(myArray[0].length);

		var get = varTextNode.data.replace(/[{}]/g, '');

		var pineVar = document.createElement("pnv");
		El.attr(pineVar, "var", get);
    	varTextNode.remove();

    	initMe.parentNode.insertBefore(pineVar, postVarTextNode);
	}
}



PINE.pnv.lastRulesID = 0;
PINE.pnv.attrRules = [];

PINE.pnv.parseAtts = function(initMe)  {

	if(El.attr(initMe, "pnvatts"))
		return;

	var myRules = {};
	

	for(var i = 0; i < initMe.attributes.length; i++)  {
		var att = initMe.attributes[i];

		var watched_vars = att.value.match( /{{.+?}}/g );
		if(watched_vars)  {

			// console.log(watched_vars, initMe);

			var attName = att.name;

				//
			if(myRules.ID == undefined) {
				myRules.ID = PINE.pnv.lastRulesID++;
				PINE.pnv.attrRules[myRules.ID] = myRules;
				myRules.atts = {};
			}

			var attRules = myRules.atts[att.name] = {};
			attRules.originalText = att.value;

			attRules.rules = [];

			// var allPromises = [];
			var setAttValue = attRules.originalText;

			for(var r = 0; r < watched_vars.length; r++) {
				var rule = {};
				rule.targetText = watched_vars[r];

				PINE.varCode(initMe, rule.targetText, function(value){
					// console.log(initMe, rule.targetText, value);
					setAttValue = setAttValue.replace(rule.targetText, value);
				});

				// allPromises.push(El.getVar(rule.targetText).then(function(value) {
				// 	setAttValue.replace(rule.targetText, value);
				// }));	
			}

			// console.log(setAttValue)

			// SyncPromise.all(allPromises).then(function() {
				El.attr(initMe, attName, setAttValue);
			// });
		}
	}

	if(myRules.ID)
		El.attr(initMe, "pnvatts", myRules.ID);
}






PINE.createNeedle("pnv", function(pnv){
	pnv.FNS.pnvUpdate = function() {
		var initMe = this.domNode;
		var get = El.attr(initMe, "var");

		if(get != null)  {
			return new SyncPromise(function(resolve) {
				PINE.varCode(initMe, get, function(val) {
					// initMe.textContent = val;
					initMe.innerHTML = val;	
					resolve();
				});
			});
		}
		else return SyncPromise.resolved();
	}

	pnv.addInitFn({ 
		opType: PINE.ops.STATIC, 
		isAsync: true,
		fn:  function(state, args) {
			this.FNS.pnvUpdate().syncThen(args.complete);
		}
	});
});




PINE.createNeedle("[pvars]").addInitFn( { 
	opType: PINE.ops.PVARS, 
	// isMultirun: true,
	fn: function() {
		var initMe = this.domNode;
		var pvar_att = El.attr(initMe, "pvars");

		if(pvar_att) {
			var pvars = pvar_att.split(/[;=]/g);
			if(pvars.length%2 != 0)
				PINE.err("syntax error in "+pvar_att+". Correct Syntax eg 'hat=hatlist[i];thing=thinglist[i]'");

			for(var i_s = 0; i_s < pvars.length; i_s+=2) {
				var pvar = pvars[i_s];
				var value = El.pvar(initMe, pvars[i_s+1]);
				initMe.PVARS[pvar] = value;
			}
		}
	}
});

//the order of these two matters




// PINE.createNeedle("[pnvatts]").addInitFn( { 
// 	opType: PINE.ops.STATIC, 
// 	isAsync: true,
// 	// isMultirun: true,
// 	fn: function(state, args) {
// 		var resolve = args.complete;
// 		var initMe = this.domNode;

// 		var rulesIndex = El.attr(initMe, "pnvatts");
// 		var rules = PINE.pnv.attrRules[rulesIndex];

// 		console.log(rules);

// 		var allPromises = [];

// 		for(var k_att in rules)  {
// 			new function(att, outVal) {
// 				var matches = outVal.match(/{{.+?}}/g);

// 				var att_promises = [];
// 				for(var i_m in matches)  {
// 					var replaceMe = matches[i_m];

// 					var key = matches[i_m].replace(/^{{|}}$/g, '');
// 					var addMe = new SyncPromise(function(resolve) {
// 						PINE.varCode(initMe, key, function(result) {
// 							outVal = outVal.replace(replaceMe, result);
// 							resolve();
// 						});
// 					});

// 					att_promises.push(addMe);
// 					allPromises.push(addMe);
// 				}

// 				SyncPromise.all(att_promises).syncThen(function() {
// 					var oldVal = El.attr(initMe, att);
// 					El.attr(initMe, att, outVal);
// 				});

// 			}(k_att, rules[k_att]);
// 		}

// 		SyncPromise.all(allPromises).syncThen(resolve);
// 	}
// });



PINE.nodeScopedVar = function(domNode, varName) {
	PINE.err("don't use node scoped var!! use El.pvar");
	return El.pvar(domNode, varName);
}

El.getVar = El.pvar = function(domNode, varName) {
	return pnv.getVarFrom(varName, domNode);
}

ElementHelper.prototype.pvar = function(varName) {
	return El.pvar(this.domNode, varName);
}



pnv.getVarFrom = function(keyArrayOrName, currentNode, superRoot)  {
	if(typeof keyArrayOrName == "boolean" || typeof keyArrayOrName == "undefined")
		return keyArrayOrName;

	// if(typeof keyArrayOrName == "string") {
	// 	var tmp = keyArrayOrName.trim();

	// 	if( tmp.match(/^".*"$/) || tmp.match(/^'.*'$/) )
	// 		return tmp.substr(1, tmp.length-2);		
	// }

		
	
		//
	//set pvars locations and default currentNode to window if outside the scope of PINE Vars
	var pvars;
	if(!currentNode || !currentNode.PVARS)
		pvars = currentNode = window;
	else
		pvars = currentNode.PVARS;

	//if there is no super root, set it to this node.  All nested variables ie not_nested[nested] will be
	//searched for from this root
	if(superRoot === undefined)
		superRoot = currentNode;

	//if a string was given instead of a keyarray, convert the string
	var keyArray;
	if(typeof keyArrayOrName == "string") {
		keyArrayOrName = keyArrayOrName.trim();
		var reservedValue = pnv.checkForReservedValue(keyArrayOrName);
		if(reservedValue != "NON_RESERVED")
			return reservedValue;

		keyArray = U.stringToVariableLayers(keyArrayOrName, true);
	}
	else
		keyArray = keyArrayOrName;

	LOG("pnv", currentNode, keyArray);

	//if the keyArray is not null
	//check that the first entry is in fact a string, err if not
	//check if this node has the string as a property.  if it does, go for it
	//if this object does not have the property and there is a parent, check the parent
	//in all fail cases return undefined
	if(keyArray.length > 0) {
		if(typeof keyArray[0] != "string") 
			PINE.err("first attribute of "+keyarray+" is not a string");

		if(pvars.hasOwnProperty(keyArray[0])) {
			return U.getnit(pvars, keyArray, undefined, function(keyArray) {
				return pnv.getVarFrom(keyArray, superRoot);
			});
		}

		else if(currentNode.parentNode !== undefined) {
			return pnv.getVarFrom(keyArray, currentNode.parentNode, superRoot);
		}
	}

	return undefined;
}


pnv.checkForReservedValue = function(checkMe) {
	var checkMe = checkMe.trim();
	if(checkMe == "true")
		return true;
	else if(checkMe == "false")
		return false;
	else if(checkMe == "null")
		return null;
	else if(checkMe == "undefined")
		return undefined;

	if(checkMe.indexOf('.') != -1) {
		var float = parseFloat(checkMe);
		if (!isNaN(float))
			return float;
	}
	else {
		var int = parseInt(checkMe);
		if (!isNaN(int))
			return int;
	}

	if(checkMe.match(/^'[^']*'$/g))
		return checkMe.replace(/^'|'$/g, '');

	else if(checkMe.match(/^"[^"]*"$/g))
		return checkMe.replace(/^"|"$/g, '');;

	return "NON_RESERVED";
}


// pnv.getVarFrom = function(varName, domNode)  {

// 	var scope = domNode;
// 	if(!domNode || !domNode.PVARS)
// 		scope = window;


// 	LOG("pnv", varName, domNode, domNode.PVARS);

// 	var rootVar;
// 	var extension;
// 	for(var c = 0; rootVar == null && c < varName.length; c++) {
// 		var char = varName.charAt(c);

// 		if(char == '[' || char == '.') {
// 			var rootVarName = varName.substring(0, c);
// 			var extension = varName.substring(c);
// 			rootVar = pnv.searchForPinevar(rootVarName, domNode);
// 		} 
// 	}

// 	if(rootVar == undefined) {
// 		rootVar = pnv.searchForPinevar(varName, domNode);
// 	}

	

// 	if(extension) {
// 		LOG("pnv", "root and extension ", rootVar, extension);
// 		return U.get(rootVar, extension, function(start, varName){
// 			return pnv.getVarFrom(varName, domNode);
// 		});
// 	}
// 	else return rootVar;
// }




// pnv.searchForPinevar = function(varName, domNode)  {
// 	// var scope = domNode;
// 	// if(!domNode || !domNode._pine_){
// 	// 	// console.log("no node");
// 	// 	scope = window;
// 	// }

// 	var scope = (domNode && domNode.PVARS) ? domNode : window;
	
// 	// console.log("getting "+varName+" from:"); 
// 	// console.log(scope);

// 	if(scope.PVARS && scope.PVARS.hasOwnProperty(varName))
// 		return scope.PVARS[varName];

// 	if(scope.parentNode)
// 		return pnv.getVarFrom(varName, scope.parentNode);

// 	else {
// 		// console.log(scope, varName, scope[varName]);
// 		return scope[varName];
// 	}
// }



PINE.var = function( ) {
	alert("don't use PINE.var, use PINE.nodeScopedVar on PINE.varCode");
	PINE.err("don't use PINE.var, use PINE.nodeScopedVar on PINE.varCode");
}


PINE.varCode = function(domScope, varCode, callback)  {
	if(varCode.startsWith("{{"))
		varCode = varCode.replace(/^{{/, "")

	if(varCode.endsWith("}}"))
		varCode = varCode.replace(/}}$/, "")

	for (var vneedle in pnv.needles) {
		if(varCode.startsWith(vneedle))
			return pnv.needles[vneedle](domScope, varCode, callback);
	}

	pnv.needles.PNV_DEFAULT(domScope, varCode, callback);
}


// pnv.runPVarCode = function(scope, pvarCode) {
// 	if(pvarCode.indexOf("? ") == 0) {
		
// 	}
// }






var Comparitor = pnv.Comparitor = function(name, onSimplify) {
	this.name = name;
	this.simplify = onSimplify;
}

pnv.comparitorList = [];
pnv.comparitorList.push(new Comparitor("&&", function(left, right) {
	return left && right;
}));
pnv.comparitorList.push(new Comparitor("||", function(left, right) {
	return left || right;
}));
pnv.comparitorList.push(new Comparitor("==", function(left, right) {
	return left == right;
}));
pnv.comparitorList.push(new Comparitor("!=", function(left, right) {
	return left != right;
}));
pnv.comparitorList.push(new Comparitor(">=", function(left, right) {
	return left >= right;
}));
pnv.comparitorList.push(new Comparitor("<=", function(left, right) {
	return left <= right;
}));
pnv.comparitorList.push(new Comparitor("<", function(left, right) {
	return left < right;
}));
pnv.comparitorList.push(new Comparitor(">", function(left, right) {
	return left > right;
}));




pnv.runConditional = function(scope, conditional) {
	// conditional = conditional.trim();
	var tree = pnv.createConditionTree(conditional);

	if(typeof tree == "string"){
		// console.log(scope, tree, El.getVar(scope, tree));
		return El.getVar(scope, tree);
	}

	return pnv.solveConditionTree(scope, tree);
}




pnv.createConditionTree = function(conditional) {
	//remove outer parenthesis
	if(conditional.charAt(0) == '(' && conditional.charAt(conditional.length-1) == ')')
		conditional = conditional.substr(1, conditional.length-2);
	
	//go through character for character, skipping anything inside parenthesis
	//when you happen upon a comparitor, split the conditional into two children of it (2 + 2) becomes + : [2, 2]
	var parenDepth = 0;
	for (var i = 0; i < conditional.length; i++) {
		var char = conditional.charAt(i);
		if(char == '(')
			parenDepth++;

		else if(char == ')')
			parenDepth--;

		if (parenDepth == 0) {
			for(var i_c in pnv.comparitorList) {
				var comparitor = pnv.comparitorList[i_c];
				var key = comparitor.name;
				if (conditional.startsWith(key, i)) {
					var out = {};
					out.comparitor = comparitor;
					var left = conditional.substring(0, i).trim();
					var right = conditional.substring(i + key.length).trim();
					out.left = pnv.createConditionTree(left);
					out.right = pnv.createConditionTree(right);
					return out;
				}
			}	
		}
	}

	return conditional;
}


pnv.solveConditionTree = function(scope, root) {
	var left = root.left;
	if(typeof left == "string")
		left = El.getVar(scope, left);
	else if (typeof left == "object")
		left = pnv.solveConditionTree(scope, left);

	var right = root.right;
	if(typeof right == "string")
		right = El.getVar(scope, right);
	else if (typeof right == "object")
		right = pnv.solveConditionTree(scope, right);

	return root.comparitor.simplify(left, right);
}






pnv.needles = {};
pnv.needles["PNV_DEFAULT"] = function(domScope, varName, callback) {
	var pinevar = pnv.getVarFrom(varName, domScope);
	callback(pinevar);
}


pnv.needles["? "] = function(scope, pvarCode, callback) {
	

	var args = pvarCode.split(':');
	if(args.length > 3)
		return PINE.err("syntax error in '"+pvarCode+"'.  Proper format is {{? thing == true : trueOutput : falseOutput}} with falseOutput being optional.");

	var conditional = args[0].substring(2) || pvarCode.substring(2);
	var conditionBool = pnv.runConditional(scope, conditional);

	// console.log("????", conditional, conditionBool, args);

	if (args.length > 1 && conditionBool) {
		var tmp = El.getVar(scope, args[1])
		callback(tmp);
	}
	
	else if(args.length == 3)
		callback(El.getVar(scope, args[2]));

	else if(args.length == 2)
		callback('');

	else
		callback(conditionBool);
}














