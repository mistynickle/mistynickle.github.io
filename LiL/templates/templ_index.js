var Gallery = {
	startIndex: 1,
	images: [
		{ title: "Pine Cononagon", href: "Pine_Cononagon-Render_Glamor.png" },
		{ title: "Blacklightboard", href: "Playwood_Palace-Blackboard.png" },
		{ title: "Playwood Palace", href: "Playwood_Palace-by_Mystic_Loden.png" },
		{ title: "Inner Adults", href: "Playwood_Palace-Inner_Adults.png" },
	],
};




var img_paths = {
	base: "../../public/images/",
	default: "photos/",
	large: "photos/1200x1200/",
	tiny: "photos/100x100/",
	gif: "gifs/",
}
Gallery.images.forEach((img) => {
	if(img.href.endsWith(".gif")) {
		img.fullHref = img_paths.base + img_paths.gif + img.href;
		img.largeHref = img.tinyHref = img.fullHref;
	}
	else {
		img.fullHref = img_paths.base + img_paths.default + img.href;
		img.tinyHref = img_paths.base + img_paths.tiny + img.href;	
		img.largeHref = img_paths.base + img_paths.large + img.href;	
	}
});
Gallery.startImage = Gallery.images[Gallery.startIndex].largeHref;
Gallery.images[Gallery.startIndex].isSelected = true;