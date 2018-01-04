FREEZE = {};

FREEZE.exclusionList = [];
FREEZE.disclude = function(discludeMe) {
	if(typeof discludeMe == "string") {

	}
	else {
		FREEZE.exclusionList.push(discludeMe);
	}
}


FREEZE.ignoreNoFreezeAttribute = false;
document.addEventListener("DOMContentLoaded", function() {
	document.body.appendChild(FREEZE.$widget);
	document.getElementById("freeze_widget_textarea")
	.addEventListener("keydown", function(event) {
		console.log(event);
		FREEZE.exportRelativePath = event.target.value;
		localStorage.setItem('freeze_export_relative_path', FREEZE.exportRelativePath);
	});

	if(FREEZE.ignoreNoFreezeAttribute == false) {
		$doNotFreezeUs = document.querySelectorAll("*[NoFreeze]");
		for(var i = 0; i < $doNotFreezeUs.length; i++) {
			FREEZE.disclude($doNotFreezeUs[i]);
		}
	}
})


FREEZE.exportRelativePath = localStorage.getItem('freeze_export_relative_path') || "";
FREEZE.regexs = {};
FREEZE.regexs.cssUrl = /url\(\s*(['`"])(.*?)\1\s*\)/g;
FREEZE.regexs.attribute = /(src|href)=\s*(['"])(.*?)\2/g
FREEZE.export = function() {
	FREEZE.exclusionList.forEach((item) => { item.remove(); });

	var out = document.body.parentElement.innerHTML;

	if(FREEZE.exportRelativePath != "") {
		out = out.replace(FREEZE.regexs.cssUrl, function(match, p1, p2) {
			// console.log(match);
			var newUrl = p2.replace(FREEZE.exportRelativePath, "");
			newUrl = newUrl.replace("templ_", "");
			return match.replace(p2, newUrl);
		});

		out = out.replace(FREEZE.regexs.attribute, function(match, p1, p2, p3) {
			console.log(p3, FREEZE.exportRelativePath);
			var newUrl = p3.replace(FREEZE.exportRelativePath, "");
			newUrl = newUrl.replace("templ_", "");
			return match.replace(p3, newUrl);
		});

		// out = out.replace("templates/", "");
		// out = out.replace("templ_", "");
	}
	
	console.log(out);

	var blob = new Blob([out], {type: 'text/plain'}); // pass a useful mime type here
	var url = URL.createObjectURL(blob);
	window.location = url;
	console.log(url);
}



FREEZE.$widget = document.createElement("FREEZE-Widget");
FREEZE.disclude(FREEZE.$widget);
FREEZE.$widget.style.right = "0px";
FREEZE.$widget.innerHTML = `
<style>
	FREEZE-Widget {
		display: block;
		position: fixed;
		top: 0px;
		padding: 0px 0px 10px 10px;
		z-index: 9999;
		opacity: 0;
		background: black;
		color: white;
	}

	FREEZE-Widget:hover {
		opacity: 1;
	}
</style>

<button onclick="FREEZE.export()">Export Page</button>
<button onclick="FREEZE.moveWidget()">&lt;-&gt;</button>
<br>
Relative Path:<br>
<input id="freeze_widget_textarea" type="textarea" value="`+FREEZE.exportRelativePath+`"></input>
`
FREEZE.moveWidget = function() {
	if(FREEZE.$widget.style.left != "") {
		FREEZE.$widget.style.left = "";
		FREEZE.$widget.style.right = "0px";
	}
	else {
		FREEZE.$widget.style.left = "0px";
		FREEZE.$widget.style.right = "";
	}
}










