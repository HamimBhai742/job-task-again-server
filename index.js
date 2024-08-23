const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PROT || 3000
app.use(express.json());
require('dotenv').config()

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://job-task-again.firebaseapp.com",
        "https://job-task-again.web.app",
        // "https://cardoctor-bd.firebaseapp.com",
    ]
}))


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://job_task_again:ScFC0UHSyRLHKDOc@cluster0.bls3tyg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        const database = client.db("productsDB");
        const productCollection = database.collection("products");
        const cartCollection = database.collection("myCarts");

        app.post('/products', async (req, res) => {
            const product = req.body
            const result = await productCollection.insertOne(product);
            res.send(result)
        })

        app.post('/add-to-cart', async (req, res) => {
            const carts = req.body
            const result = await cartCollection.insertOne(carts);
            res.send(result)
        })

        app.patch('/add-to-cart/:id', async (req, res) => {
            const id = req.params.id
            const price = parseFloat(req.query.price)
            const qty = parseInt(req.query.qty)
            console.log(qty);
            const filter = { _id: new ObjectId(id) };
            console.log(price);
            const updateDoc = {
                $set: {
                    productPrice: price,
                    productQuantity: qty
                },
            };
            const result = await cartCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.patch('/deletPro/:id', async (req, res) => {
            const id = req.params.id
            const price = parseFloat(req.query.price)
            const qty = parseInt(req.query.qty)
            console.log(qty);
            const filter = { _id: new ObjectId(id) };
            console.log(price);
            const updateDoc = {
                $set: {
                    productPrice: price,
                    productQuantity: qty
                },
            };
            console.log(updateDoc);
            const result = await cartCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.delete('/deletePro/:id', async (req, res) => {
            const id = req.params.id
            const query = {
                _id: new ObjectId(id)
            }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })

        app.get('/products', async (req, res) => {
            const result = await productCollection.find().toArray()
            res.send(result)
        })

        app.get('/my-carts', async (req, res) => {
            const result = await cartCollection.find().toArray()
            res.send(result)
        })

        app.get('/productsCategorization', async (req, res) => {
            const all = req.query
            const brandName = all.brandName
            const productCategory = all.productCategory
            const minPrice = parseInt(all.minPrice) || 0
            const maxPrice = parseInt(all.maxPrice) || Infinity
            const query = {
                brandName: {
                    "$regex": brandName, "$options": "i"
                },
                productCategory: {
                    "$regex": productCategory, "$options": "i"
                },
                productPrice: {
                    $lte: maxPrice, $gte: minPrice
                }
            }

            const result = await productCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/productsPage', async (req, res) => {
            const sorts = req.query
            const query = {}
            let options = {}
            if (sorts.sorting === 'asc') {
                options.sort = {
                    productPrice: 1
                }

            }
            else if (sorts.sorting === 'desc') {
                options.sort = {
                    productPrice: -1
                }

            }
            else if (sorts.sorting === 'recently') {
                options.sort = {
                    productDaTa: -1
                }
            }

            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)
            const result = await productCollection.find(query, options)
                .skip(page * size)
                .limit(size)
                .toArray()

            res.send(result)
        })

        app.get('/searchProduct', async (req, res) => {
            const search = req.query.search
            const query = {
                productName: {
                    "$regex": search, "$options": "i"
                }
            }
            const result = await productCollection.find(query)
                .toArray()

            res.send(result)
        })
        app.get('/productsCount', async (req, res) => {
            const count = await productCollection.estimatedDocumentCount()
            res.send({ count })
        })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Crazy Shop Server Is Running.......')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})