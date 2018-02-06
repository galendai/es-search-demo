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
        index:'articles',
        type:'magazine',
        body: {
            query: {
                multi_match: {
                    query: key,
                    fields: [
                        "Title",
                        "ContentB"
                    ]
                }
            },
            highlight: {
                fields: {
                    Title: { },
                    ContentB: { }
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
        res.render('article', {
            title: data.Title,
            magazineName: `《${data.MagazineName}》`,
            issue: `${data.Year}年${data.Issue}期`,
            content: decryptByDESModeCBC(data.Content, key).replace(/src=\"\/qkimages/g, 'src="http://img1.qikan.com/qkimages')
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
