
var fn_higlightCorrectLink = function () {
	document.getElementById(ID_OF_LINK_FOR_CURRENT_PAGE).classList.add("current_page");
}

if(window.hasOwnProperty("PINE"))
	PINE.ready(fn_higlightCorrectLink);
else 
	document.addEventListener("DOMContentLoaded", fn_higlightCorrectLink);		



