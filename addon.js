const { addonBuilder } = require("stremio-addon-sdk");

const {catalog,search,meta,stream} = require("./source");
// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = require("./manifest");
const builder = new addonBuilder(manifest)

builder.defineStreamHandler((args) => {
	console.log("addon.js streams:", args);
	if (args.id.match(/kisskh:[^xyz]*/i)) {
		return Promise.resolve(stream(args.type, args.id))
		.then((streams) => ({ streams: streams }));
		//.then((streams) => { console.log('streams', streams)});
	} else {
		console.log('stream reject');
		return Promise.resolve({ streams: [] });
	}
});

builder.defineCatalogHandler((args) => {
	console.log("addon.js Catalog:", args);
	if (args.extra.search) {
		return Promise.resolve(search(args.type,args.id, args.extra.search,args.extra.skip,args.config.sub))
			//.then((metas) => { console.log('metas', metas) });
			.then((metas) => ({ metas: metas }));
	} else {
		return Promise.resolve(catalog(args.type, args.id,args.extra.skip,args.extra.genre,args.config.sub))
			//.then((metas) => { console.log('metas', metas) });
			.then((metas) => ({ metas: metas }));
	}
});

builder.defineMetaHandler((args) => {
	console.log("addon.js meta:", args);

	if (args.id.match(/kisskh:[^xyz]*/i)) {
		//console.log('meta mycima');
		return Promise.resolve(meta(args.type, args.id))
			//.then((metas) => { console.log('metas', metas)});
			.then((meta) => ({ meta: meta }));
	} else {
		console.log('meta reject');
		return Promise.resolve({ meta: [] });
	}


});

module.exports = builder.getInterface()