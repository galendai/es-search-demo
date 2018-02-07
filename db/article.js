const Sequelize = require('sequelize');
const Op = require('sequelize').Op
const operatorsAliases = {}
const es = require('elasticsearch');

const sequelize = new Sequelize('mssql://dragon:dragon@192.168.0.5:1433/DragonISS', {
    operatorsAliases,logging:false,
    dialectOptions:{
        requestTimeout: 999999,
        // instanceName:'DEV'
    }  //设置MSSQL超时时间
});
var username = 'kibana'
var password = 'bG&kLHEPz1uLegzkoYPk'
const client = new es.Client({
    host: 'localhost:9200',
    httpAuth: `${username}:${password}`,
    // log: 'trace'
});

var CryptoJS = require("crypto-js");

const test = async function () {

    // const query = `SELECT * FROM (
    //     SELECT *, ROW_NUMBER()
    //     OVER (ORDER BY MagazineArticleID) AS RowNumberForSplit
    //     FROM  MagazineArticle) temp
    //     WHERE RowNumberForSplit BETWEEN ${ 70000 } AND ${ 70000 }`

    const  query = `
    SELECT 
    TOP 1 
    *
    FROM [MagazineArticle]
    where [MagazineArticleID] < (SELECT MIN([MagazineArticleID]) FROM (SELECT TOP 1270000 [MagazineArticleID] 
                  FROM [MagazineArticle] 
                  ORDER BY [MagazineArticleID] DESC
                    ) AS T
           )
    ORDER BY [MagazineArticleID] DESC
    `

    console.log(new Date())
    var sqldata = await sequelize.query(query);
    console.log(new Date())
    console.log(sqldata)

    var data = sqldata[0][0].Content;

   // console.log(new Base64().decode(data))

    var key = 'DSEPUB86'

    console.log(decryptByDESModeCBC(data,key))
    process.exit()

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

    // client.indices.create({
    //     index: 'articles',
    //     body: {
    //         mappings: {
    //             magazine: {
    //                 properties: {
    //                     TitleID: {
    //                         type: "text",
    //                         analyzer: "ik_smart",
    //                         search_analyzer: "ik_smart"
    //                     },
    //                     MagazineArticleID: {
    //                         type: "text",
    //                         analyzer: "ik_smart",
    //                         search_analyzer: "ik_smart"
    //                     },
    //                     Title: {
    //                         type: "text",
    //                         analyzer: "ik_smart",
    //                         search_analyzer: "ik_smart"
    //                     },
    //                     ContentB: {
    //                         type: "text",
    //                         analyzer: "ik_smart",
    //                         search_analyzer: "ik_smart"
    //                     },
    //                 }
    //             }
    //         }
    //     }
    // });
    //
    // var ping = await client.ping({
    //     requestTimeout: 1000
    // });
    // if (!ping) {
    //     console.log('elasticsearch cluster is down!');
    // } else {
    //     console.log('elasticsearch is well');
    // }
    // var count = (await client.count()).count;
    // var count_has = await countMagazineArticlesAsync();
    // console.log(`indexed:${count}/${count_has}`);
    // if (count!=count_has){
    //     console.log('update...')
    // }
    // var articles = await magazineArticlesAsync();
    // await save(articles[0]);
    // setTimeout(async function () {
    //     var count = (await client.count()).count;
    //     var count_has = await countMagazineArticlesAsync();
    //     console.log(`indexed:${count}/${count_has}`);
    //
    //     var sr = await client.search({
    //         index:'articles',
    //         type:'magazine',
    //         body: {
    //             query: {
    //                 multi_match: {
    //                     minimum_should_match: "10%",
    //                     query: "几秒钟 欧盟",
    //                     fields: [
    //                         "Title",
    //                         "ContentB"
    //                     ]
    //                 }
    //             },
    //             highlight: {
    //                 fields: {
    //                     Title: { },
    //                     ContentB: { }
    //                 }
    //             }
    //         }
    //     });
    //     console.log(sr.hits);
    //
    //     process.exit();
    // },3000);
}

const countMagazineArticlesAsync = async function () {
    const query = 'select count(*) as total from MagazineArticle';
    var result = await sequelize.query(query);
    return result[0][0].total;
}


const magazineArticlesAsync = async function (page = 1) {
    const start = ((page - 1) * 10) + 1
    const end = (start + 10) - 1
    const query = `SELECT * FROM (
        SELECT [TitleID], [MagazineArticleID], [Title], [ContentB], ROW_NUMBER() 
        OVER (ORDER BY MagazineArticleID) AS RowNumberForSplit 
        FROM  MagazineArticle) temp 
        WHERE RowNumberForSplit BETWEEN ${ start } AND ${ end }`

    return await sequelize.query(query)
}

const save = async function (docs) {
    for (const doc of docs) {
        try {
            // if (doc.ContentB==null && doc.Content!=null){
            //     doc.ContentB = doc.Content;
            // }
            var exists = await client.exists({
                index:'articles',
                type:'magazine',
                id:doc.TitleID
            });
            if(exists){
                await client.update({
                    index: 'articles',
                    type: 'magazine',
                    id: doc.TitleID,
                    body:{
                        doc: {
                            TitleID: doc.TitleID,
                            MagazineArticleID: doc.MagazineArticleID,
                            Title: doc.Title,
                            ContentB: doc.ContentB,
                            MagazineName: doc.MagazineName,
                            Year: doc.Year,
                            Issue: doc.Issue,
                        }
                    },
                })
            }else {
                await client.create({
                    index: 'articles',
                    type: 'magazine',
                    id: doc.TitleID,
                    body: {
                        TitleID: doc.TitleID,
                        MagazineArticleID: doc.MagazineArticleID,
                        Title: doc.Title,
                        ContentB: doc.ContentB,
                        MagazineName: doc.MagazineName,
                        Year: doc.Year,
                        Issue: doc.Issue,
                    },
                })
            }
        } catch (err) {
            console.log(err)
        }
    }
}

const importer = async function () {

    var isIndexExists = await client.indices.exists({index: 'articles'});
    if(!isIndexExists){
        client.indices.create({
            index: 'articles',
            body: {
                mappings: {
                    magazine: {
                        // "_source": {
                        //     "enabled": false
                        // },
                        properties: {
                            TitleID: {
                                type: "text",
                            },
                            MagazineArticleID: {
                                type: "text",
                            },
                            Title: {
                                type: "text",
                                // "store": true,
                                analyzer: "ik_smart",
                                search_analyzer: "ik_smart",
                            },
                            ContentB: {
                                type: "text",
                                // "store": true,
                                analyzer: "ik_smart",
                                search_analyzer: "ik_smart",
                            },
                            MagazineName: {
                                type: "text",
                            },
                            Year: {
                                type: "text",
                            },
                            Issue: {
                                type: "text",
                            },
                        }
                    }
                }
            }
        });
    }

    try {
        await sequelize
            .authenticate()
            .then(() => {
                console.log('Connection has been established successfully.')
            })
            .catch((err) => {
                console.error('Unable to connect to the database:', err)
            })
    } catch (err) {
        console.log(err)
        return
    }

    const limit = 10000

    const magazineArticles = function (page = 1) {
        const start = ((page - 1) * limit)
        var query = ''
        if (page==1){
            query = `
            SELECT TOP ${limit} [TitleID], [MagazineArticleID], [Title], [ContentB], [Content], [MagazineName], [Year], [Issue]
            FROM [MagazineArticle] ORDER BY [MagazineArticleID] DESC
            `
        }else {
            query = `
                SELECT
                TOP ${limit}
                [TitleID], [MagazineArticleID], [Title], [ContentB], [MagazineName], [Year], [Issue]
                FROM [MagazineArticle]
                where [MagazineArticleID] < (SELECT MIN([MagazineArticleID]) FROM (SELECT TOP ${start} [MagazineArticleID]
                              FROM [MagazineArticle]
                              ORDER BY [MagazineArticleID] DESC
                                ) AS T
                       )
                ORDER BY [MagazineArticleID] DESC
            `
        }

        // const start = ((page - 1) * limit) + 1
        // const end = (start + limit) - 1
        // const query = `SELECT * FROM (
        // SELECT [TitleID], [MagazineArticleID], [Title], [ContentB], [MagazineName], [Year], [Issue], ROW_NUMBER()
        // OVER (ORDER BY MagazineArticleID) AS RowNumberForSplit
        // FROM  MagazineArticle) temp
        // WHERE RowNumberForSplit BETWEEN ${ start } AND ${ end }`

        return sequelize.query(query)
    }

    const countMagazineArticles = function () {
        const query = 'select count(*) as total from MagazineArticle'

        return sequelize.query(query).then((res) => {
            return res[0][0].total
        })
    }

    const total = await countMagazineArticles()
    const page = Math.ceil(total / limit)
    console.log('@数据量:', total)
    console.log('@分页数:', page)

    for (let i = 1; i <= page; i += 1) {
        console.log(`开始处理第 ${ i } 页...`)
        try {
            const res = await magazineArticles(i)
            await save(res[0])
        } catch (err) {
            console.log(err)
        }
        console.log(`第 ${ i } 页处理完毕`)
    }

    console.log('\n\n@End\n\n')
}

module.exports.seq = sequelize
module.exports.es = client
module.exports.importer = importer
module.exports.test = test