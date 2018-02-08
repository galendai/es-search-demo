require('dotenv').config();
const Sequelize = require('sequelize');
const Op = require('sequelize').Op
const operatorsAliases = {}
const es = require('elasticsearch');
var CryptoJS = require("crypto-js");

const sequelize = new Sequelize(process.env.SQLSERVER || 'mssql://dragon:dragon@192.168.0.5:1433/DragonISS', {
    operatorsAliases,logging:false,
    dialectOptions:{
        requestTimeout: 999999,
        // instanceName:'DEV'
    }  //设置MSSQL超时时间
});
var username = process.env.ESUSER || ''
var password = process.env.ESNAME || ''
const client = new es.Client({
    host: process.env.ESHOST || 'localhost:9200',
    httpAuth: `${username}:${password}`,
    // log: 'trace'
});

const test = async function () {


}

const importer = async function () {

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

    for (var y=1990;y<=2020;y++){
        try {
            var isIndexExists = await client.indices.exists({index: `articles-${y}`});
            if(!isIndexExists){
                client.indices.create({
                    index: `articles-${y}`,
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
        } catch (err) {
            console.log(err)
            return
        }
    }

    var isIndexExistsOld = await client.indices.exists({index: `articles-old`});
    if(!isIndexExistsOld){
        client.indices.create({
            index: 'articles-old',
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

    const total = await countMagazineArticlesAsync()
    const page = Math.ceil(total / limit)
    console.log('@数据量:', total)
    console.log('@分页数:', page)

    for (let i = 1; i <= page; i += 1) {
        console.log(`开始处理第 ${ i } 页...`)
        try {
            const res = await magazineArticlesAsync(i)
            await save(res[0])
        } catch (err) {
            console.log(err)
        }
        console.log(`第 ${ i } 页处理完毕`)
    }

    console.log('@End')
    process.exit();
}


const limit = 10000;

const countMagazineArticlesAsync = async function () {
    const query = 'select count(*) as total from MagazineArticle';
    var result = await sequelize.query(query);
    return result[0][0].total;
}

const magazineArticlesAsync = async function (page = 1) {
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
                [TitleID], [MagazineArticleID], [Title], [ContentB], [MagazineName], [Year], [Issue], [Content]
                FROM [MagazineArticle]
                where [MagazineArticleID] < (SELECT MIN([MagazineArticleID]) FROM (SELECT TOP ${start} [MagazineArticleID]
                              FROM [MagazineArticle]
                              ORDER BY [MagazineArticleID] DESC
                                ) AS T
                       )
                ORDER BY [MagazineArticleID] DESC
            `
    }

    return await sequelize.query(query)
}

const save = async function (docs) {
    for (const doc of docs) {
        try {
            if (doc.ContentB==null && doc.Content!=null){
                doc.ContentB = doc.Content.replace(/<[^>]*>|/g,"")
                    .replace(/[\ |\~|\`|\!|\@|\#|\$|\%|\^|\&|\*|\(|\)|\-|\_|\+|\=|\||\\|\[|\]|\{|\}|\;|\:|\"|\'|\,|\<|\.|\>|\/|\?|\，|\。|\：|\“|\？|\”|\！|\（|\）|\；]/g,"")
                    .replace(/\s/g, "").replace(/\r/g, "").replace(/\n/g, "");
            }
            var indexd = 'articles-old'
            if (doc.Year>=1990){
                indexd = `articles-${doc.Year}`
            }
            var exists = await client.exists({
                index:indexd,
                type:'magazine',
                id:doc.TitleID
            });
            if(exists){
                await client.update({
                    index: indexd,
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
                    index: indexd,
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

const bulkSave = async function (docs) {
    var arr = new Array();
    for (const doc of docs) {
        try {
            if (doc.ContentB==null && doc.Content!=null){
                doc.ContentB = doc.Content.replace(/<[^>]*>|/g,"")
                    .replace(/[\ |\~|\`|\!|\@|\#|\$|\%|\^|\&|\*|\(|\)|\-|\_|\+|\=|\||\\|\[|\]|\{|\}|\;|\:|\"|\'|\,|\<|\.|\>|\/|\?|\，|\。|\：|\“|\？|\”|\！|\（|\）|\；]/g,"")
                    .replace(/\s/g, "").replace(/\r/g, "").replace(/\n/g, "");
            }
            var indexd = 'articles-old'
            if (doc.Year>=1990){
                indexd = `articles-${doc.Year}`
            }
            arr.push({ index:  { _index: indexd, _type: 'magazine', _id: doc.TitleID } });
            arr.push({
                TitleID: doc.TitleID,
                MagazineArticleID: doc.MagazineArticleID,
                Title: doc.Title,
                ContentB: doc.ContentB,
                MagazineName: doc.MagazineName,
                Year: doc.Year,
                Issue: doc.Issue,
            });
        } catch (err) {
            console.log(err)
        }
    }
    await client.bulk({
        body: arr,
        requestTimeout: '999999'
    });
}

module.exports.seq = sequelize
module.exports.es = client
module.exports.importer = importer
module.exports.test = test