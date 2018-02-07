var express = require('express');
var router = express.Router();
var article = require('../db/article');
var CryptoJS = require("crypto-js");

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'hello' });
});

router.get('/search', function(req, res, next) {
    var page = req.query.page
    if(page==null){
        page=0;
    }
    var key = req.query.key
    if(key==null){
        key='';
    }

    article.es.search({
        index:'articles-*',
        type:'magazine',
        body: {
            "indices_boost": {
                "articles-201*": 2,
                "articles-200*": 1.66,
                "articles-199*": 1.33,
                "articles-old": 1
            },
            query: {
                multi_match: {
                    query: key,
                    fields: [
                        "Title^1",
                        "ContentB^1"
                    ]
                }
            },
            "_source": [
                "TitleID",
                "MagazineArticleID",
                "Title",
                "MagazineName",
                "Year",
                "Issue"
            ],
            highlight: {
                fields: {
                    Title: { },
                    ContentB: {
                        type:"plain",
                        fragment_size: 100,
                        number_of_fragments: 5
                    }
                }
            },
            size: 20,
            from: (20 * page),
        }
    }).then(function (resp) {
        var hits = resp.hits;
        res.json(hits);
    }, function (err) {
        console.trace(err.message);
        res.json(err.message);
    });
});

router.get('/articles/magazine/:tid', function(req, res, next) {

    var key = 'DSEPUB86'

    const query = `select * from MagazineArticle where TitleID='${req.params.tid}'`
    article.seq.query(query).then((result) => {
        var data = result[0][0];
        var content = '';
        if(data.ContentB==null){
            content = data.Content.replace(/src=\"\/qkimages/g, 'src="http://img1.qikan.com/qkimages');
        }else {
            content = decryptByDESModeCBC(data.Content, key).replace(/src=\"\/qkimages/g, 'src="http://img1.qikan.com/qkimages')
        }
        res.render('article', {
            title: data.Title,
            magazineName: `《${data.MagazineName}》`,
            issue: `${data.Year}年${data.Issue}期`,
            content: content
        });
    })
});


function decryptByDESModeCBC(ciphertext,key) {
    var keyHex = CryptoJS.enc.Utf8.parse(key);
    var ivHex = CryptoJS.enc.Utf8.parse(key);

    var decrypted = CryptoJS.DES.decrypt(ciphertext, keyHex, {
        iv:ivHex,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    var result = decrypted.toString(CryptoJS.enc.Utf8);


    return result;
}

module.exports = router;
