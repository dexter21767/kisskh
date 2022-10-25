const axios = require('axios').default;


const regions = { "All Regions": 0, "South Korea": 2, "Chinese": 1, "United States": 6, "Thailand": 5, "Japanese": 3, "Hong Kong": 4, "Taiwan": 7 }
const host = "https://kisskh.me";


const NodeCache = require("node-cache");
const StreamCache = new NodeCache({ stdTTL: (0.5 * 60 * 60), checkperiod: (1 * 60 * 60) });
const subsCache = new NodeCache({ stdTTL: (0.5 * 60 * 60), checkperiod: (1 * 60 * 60) });
const MetaCache = new NodeCache({ stdTTL: (0.5 * 60 * 60), checkperiod: (1 * 60 * 60) });
const CatalogCache = new NodeCache({ stdTTL: (0.5 * 60 * 60), checkperiod: (1 * 60 * 60) });
const SearchCache = new NodeCache({ stdTTL: (0.5 * 60 * 60), checkperiod: (1 * 60 * 60) });

client = axios.create({
    timeout: 5000,
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0"
    }
});

async function request(url, header) {

    return await client
        .get(url, header, { timeout: 5000 })
        .then(res => {
            return res;
        })
        .catch(error => {
            if (error.response) {
                console.error('error on source.js request:', error.response.status, error.response.statusText, error.config.url);
            } else {
                console.error(error);
            }
        });

}

async function getsubtitles(id) {
    try {
        let cached = subsCache.get(id);
        if (cached) {
            console.log('cached main', id, cached);
            return cached
        } else {
            url = `${host}/api/Sub/${id}`;
            let response = (await request(url));
            if (!response || !response.data) throw "error accessing url"
            subs = response.data;
            let subtitles = [];
            for (let i = 0; i < subs.length; i++) {
                subtitles.push({
                    id: subs[i].land + i,
                    url: subs[i].src,
                    lang: subs[i].label
                });
            };
            if (subtitles) subsCache.set(id, subtitles);
            return subtitles;
        }
    } catch (e) {
        console.error(e)
    }
}

async function stream(type, meta_id) {
    try {
        var res;
        var id = meta_id.split(":")[1];
        let cached = StreamCache.get(id);
        if (cached) {
            console.log('cached main', id, cached);
            res = cached
        } else {
            var url = `${host}/api/DramaList/Episode/${id}.png?err=false&ts=&time=`;
            console.log('url', url)

            let response = (await request(url));
            if (!response || !response.data) throw "error accessing url"
            res = response.data;
            if (res) StreamCache.set(id, res);
        }

        let subs = await getsubtitles(id);

        des = res.Video.split(".")
        let streams = [{ url: res.Video, name: "kisskh", description: des[des.length - 2], behaviorHints: { notWebReady: true, } }]
        streams.push({ externalUrl: res.ThirdParty, name: "external", description: res.ThirdParty.split('/')[2] })
        if (subs) streams[0].subtitles = subs
        console.log(streams);
        return streams;
    } catch (e) {
        console.error(e)
    }

}

async function meta(type, meta_id) {
    try {
        let cached = MetaCache.get(meta_id);
        if (cached) {
            console.log('cached main', meta_id, cached);
            return cached
        } else {
            var id = meta_id.split(":")[1];
            url = `${host}/api/DramaList/Drama/${id}?isq=true`
            let response = (await request(url));
            if (!response || !response.data) throw "error accessing url"
            res = response.data;

            const videos = []
            for (let i = 0; i < res.episodesCount; i++) {
                ep = res.episodes[i]
                videos.push({ id: "kisskh:" + ep.id, title: `episode ${ep.number}`, season: "1", released: res.releaseDate, episode: ep.number })
            }
            metaObj = {
                country: res.country,
                description: res.description,
                id: "kisskh:" + res.id,
                released: res.releaseDate,
                status: res.status,
                poster: res.thumbnail,
                background: res.thumbnail,
                name: res.title,
            }
            if (!res.episodesCount || res.episodesCount == 1) {
                metaObj.type == "movie"
            } else {
                metaObj.type = "series"
                metaObj.videos = videos
            }
            if (metaObj) MetaCache.set(meta_id, metaObj);
            return metaObj;
        }
    } catch (e) {
        console.error(e)
    }
}

async function search(type, id, query) {
    try {
        let url = `${host}/api/DramaList/Search?q=${encodeURIComponent(query)}&type=${id}`
        console.log('url', url);
        let cached = SearchCache.get(url)
        if (cached) {
            console.log('cached main', url, cached);
            return cached
        } else {
            let res = (await request(url));
            if (!res || !res.data) throw "error accessing url"
            response = res.data
            const meta = []
            for (let i = 0; i < response.length; i++) {
                let ele = response[i]
                meta.push({
                    id: "kisskh:" + ele.id.toString(),
                    type: ele["episodesCount"] > 1 ? "series" : "movie",
                    name: ele.title,
                    poster: ele.thumbnail
                })
            }
            if (meta) SearchCache.set(url, meta);
            return meta
        }
    } catch (e) {
        console.error(e)
    }
}

async function catalog(type, id, skip, genre) {
    try {
        console.log("catalog", type, id, skip, genre)
        if (skip) skip = Math.round((skip / 10) + 1);
        else skip = 1;
        res_type = type == "series" ? "1" : (type == "movie" ? "2" : (type == "anime" ? "3" : 0))
        var url = `${host}/api/DramaList/List?&type=${res_type}&page=${skip}&${id}&country=${regions[genre]}`
        if (type == "series" && genre == "United States") url = `${host}/api/DramaList/List?&type=4&page=${skip}&${id.split("&")[1]}&country=0`
        console.log('url', url);


        let cached = CatalogCache.get(url)
        if (cached) {
            console.log('cached main', url, cached);
            return cached
        } else {

            let res = (await request(url));
            if (!res || !res.data) throw "error accessing url"
            response = res.data.data;
            const meta = []
            for (let i = 0; i < response.length; i++) {
                let ele = response[i]
                meta.push({
                    id: "kisskh:" + ele.id.toString(),
                    type: ele["episodesCount"] > 1 ? "series" : "movie",
                    name: ele.title,
                    poster: ele.thumbnail
                })
            }
            if (meta) CatalogCache.set(url, meta);

            return meta
        }
    } catch (e) {
        console.error(e)
    }
}





module.exports = {
    catalog,
    search,
    meta,
    stream
};