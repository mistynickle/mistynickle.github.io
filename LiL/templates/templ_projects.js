var Communities = [
	{
		id: "texas_burn",
		name: "DaFT &amp; FaFT",
		date: "2015 - Current",
		logo: "../../public/images/logos/Flipside.png",
		breif: "Projects Made with the Build Teams for Texas Burning Man Regionals (Flipside &amp; Freezerburn).",

		links: [
			{ href:"https://www.burningflipside.com/", text:"BurningFlipside.com"},
			{ href:"http://www.freezerburn.org/", text:"FreezerBurn.org"},
		],

		projects: [
			{
				id: "playwood_palace",
				name: "Playwood Palace",
				date: "Jan 2017 - Apr 2017",
				role: "Designers and Build Leads",
				gallery: {
					startIndex: 3,
					images: [
						{ title: "Glamor Shot", href: "Playwood_Palace-by_Mystic_Loden.png" },
						{ title: "LiL and Fire", href: "Playwood_Palace-Bebes_and_Fire.png" },
						{ title: "Inner Adults", href: "Playwood_Palace-Inner_Adults.png" },
						{ title: "Sunset Booshers", href: "Playwood_Palace-Sunset_Booshers.png" },
						{ title: "The Forest", href: "Playwood_Palace-Forest.png" },
						{ title: "Hobbit Door", href: "Playwood_Palace-Hobbit_Door.png" },
						{ title: "Dustin Boosh", href: "Playwood_Palace-Dustin_Boosh.png" },
						{ title: "Theme Shwag", href: "Playwood_Palace-Rainbows_vs_Unicorns_Decal.png" },
						{ title: "Sunrise", href: "Playwood_Palace-Sunrise_Boosh.gif"},
						{ title: "Build Timelapse", href: "Playwood_Palace-Timelapse.gif" },
					],
				},
				info: [
					{	name: "Description",
						info: "The Effigy for Flipside 2017.  A three story playground maze with flame throwers, a giant slide, and thematic rooms including a hobit hole, a ball pit in space, a secret treasure room, a bar/cafe, and a forest." 
					},
					{	name: "Members Involved",
						info: "Misty Nickle (Design &amp; Creative Director), Seph Reed (Design &amp; Foreman)" 
					},
					{	name: "Project Website",
						info: `<a href="http://sephreed.github.io/Playwood_Palace/">sephreed.github.io/Playwood_Palace/</a>`
					},
				]
			},

			{
				id: "pine_cononagon",
				name: "Pine Cononagon",
				date: "Jan 2018 - Current",
				role: "Designers and Build Leads",
				gallery: {
					startIndex: 2,
					images: [
						{ title: "Underworld", href: "Pine_Cononagon-Cave.png" },
						{ title: "Spiral Stairs", href: "Pine_Cononagon-Render_Spiral_Stairs.png" },
						{ title: "Glamor Shot", href: "Pine_Cononagon-Render_Glamor.png" },
						{ title: "Backside", href: "Pine_Cononagon-Render_Back.png" },
						{ title: "Back Right", href: "Pine_Cononagon-Render_Back_Right.png" },
						{ title: "Second Floor", href: "Pine_Cononagon-Render_Second_Floor.png" },
					],
				},
				info: [
					{	name: "Description",
						info: "Our Effigy for Flipside 2018.  A three story pine cone which plays with themes of light, dark, and mortality.  The upper floor is the entrance into a forest which winds down into an underworld/afterlife on the first floor." 
					},
					{	name: "Members Involved",
						info: "Misty Nickle (Design &amp; Creative Director), Seph Reed (Design &amp; Foreman)" 
					},
					{	name: "Project Website",
						info: `<a href="http://mistynickle.github.io/DaFT-2018/proposal.html">mistynickle.github.io/DaFT-2018/proposal.html</a>`
					},
				]
			}
		]
	},


	{
		id: "iron_monkeys",
		name: "Iron Monkeys",
		date: "2009-2016",
		logo: "../../public/images/logos/Iron_Monkeys(small_patch).png",
		breif: "Seattle Based Metal Working Collective ... stuff with BM",

		links: [
			{ href:"http://www.ironmonkeyarts.org/", text:"IronMonkeyArts.org"}
		],

		projects: []
	}
]


var img_paths = {
	base: "../../public/images/",
	default: "photos/",
	large: "photos/1200x1200/",
	tiny: "photos/100x100/",
	gif: "gifs/",
}
Communities.forEach((comm) => {
	comm.projects.forEach((proj) => {
		proj.gallery.images.forEach((img) => {
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
		proj.gallery.startImage = proj.gallery.images[proj.gallery.startIndex].largeHref;
		proj.gallery.images[proj.gallery.startIndex].isSelected = true;

	});
});
















