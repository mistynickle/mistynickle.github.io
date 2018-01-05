function initGalleries() {
	

	var $galleries = document.getElementsByTagName("gallery");
	for(var g = 0; g < $galleries.length; g++) {
		let $gallery = $galleries[g];
		let $currentLink = $gallery.getElementsByClassName("zoomed_pic")[0];
		let $imgViewer = document.getElementById($gallery.getAttribute("target"));
		let $lastDisplayWith;

		let imgScrollTimeout = $gallery.getAttribute("imgScrollTimeout");
		if(imgScrollTimeout !== undefined)
			imgScrollTimeout = parseInt(imgScrollTimeout);


		let fn_chooseNext = function() {
			$next = $currentLink.nextElementSibling;
			if($next == undefined)
				$next = $gallery.getElementsByTagName("a")[0];

			fn_selectLink($next);
		}
		
		let fn_disableScroll = undefined;
		if(imgScrollTimeout > 100) {
			let scrollTimer;
			let noScrollTimer;

			let fn_restartTimer = function() {
					console.log("lal");
					window.clearInterval(scrollTimer);
					scrollTimer = window.setInterval(function(){
						if(noScrollTimer == undefined) 
							fn_chooseNext($gallery, $currentLink);
						else 
							window.clearInterval(scrollTimer);
					}, imgScrollTimeout);
			}

			$imgViewer.addEventListener("mousemove", fn_restartTimer);
			fn_restartTimer();

			fn_disableScroll = function() {
				if(noScrollTimer) 
					window.clearTimeout(noScrollTimer);

				noScrollTimer = window.setTimeout(function(){
					noScrollTimer = undefined;
					fn_restartTimer();
				}, 5000)
			}
		}

		let fn_selectLink = function($link) {
			$currentLink.classList.remove("zoomed_pic");
			$link.classList.add("zoomed_pic");
			$currentLink = $link;
			$imgViewer.style.backgroundImage = `url("`+$link.href+`")`;

			if($link.getAttribute("doContain") == "true")
				$imgViewer.style.backgroundSize = "contain";
			else
				$imgViewer.style.backgroundSize = "";
		}

		let links = $gallery.getElementsByTagName("a");
		for(var i = 0; i < links.length; i++) {
			let $link = links[i];
			$link.addEventListener("click", function(event) {
				event.preventDefault();

				if(fn_disableScroll !== undefined)
					fn_disableScroll();

				fn_selectLink($link);

				return false;
			});
		}


		

	}
}

if(window.hasOwnProperty("PINE"))
	PINE.ready(initGalleries);
else 
	document.addEventListener("DOMContentLoaded", initGalleries);		









