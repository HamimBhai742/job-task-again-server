const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PROT || 3000
app.use(express.json());
const { v4: uuidv4 } = require('uuid')
app.use(express.urlencoded());
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
const { default: axios } = require('axios');
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
        const paymentCollection = database.collection("myPayments");
        const stepsCollection = database.collection("myStep");
        const userCollection = database.collection("user");


        function generateTransactionID() {
            return 'txn_' + uuidv4(4).split('-')[0];
        }

        // console.log(timeAndDate);
        // console.log(transactionID);
        app.post('/user', async (req, res) => {
            const user = req.body
            console.log(user);
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

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

        app.post('/pay-setp', async (req, res) => {
            const stp = req.body
            const result = await stepsCollection.insertOne(stp);
            res.send(result)
        })

        app.post('/payment', async (req, res) => {
            const transactionID = generateTransactionID();
            const payInfo = req.body
            // const result = await cartCollection.insertOne(carts);
            const paymentInit = {
                store_id: process.env.STORE_ID,
                store_passwd: process.env.STORE_PASS,
                total_amount: payInfo.amount,
                currency: 'USD',
                tran_id: transactionID,
                success_url: `http://localhost:3000/success-payment?email=${payInfo.email}`,
                fail_url: 'http://localhost:3000/fail-payment',
                cancel_url: 'http://localhost:3000/cancel-payment',
                cus_name: payInfo.cardHolder,
                cus_email: payInfo.email,
                cus_add1: payInfo.billingAddress,
                cus_city: 'Dhaka',
                cus_state: payInfo.state,
                cus_postcode: payInfo.ZIP,
                cus_country: 'Bangladesh',
                cus_phone: '01711111111',
                cus_fax: '01711111111&',
                shipping_method: 'NO',
                ship_name: payInfo.cardHolder,
                ship_add1: payInfo.billingAddress,
                ship_city: 'Dhaka',
                ship_state: payInfo.state,
                ship_postcode: payInfo.ZIP,
                ship_country: 'Bangladesh',
                product_name: 'E-commerce',
                product_category: 'E-commerce',
                product_profile: 'general',
                multi_card_name: 'mastercard,visacard,amexcard&',
                value_a: 'ref001_A&',
                value_b: 'ref002_B&',
                value_c: 'ref003_C&',
                value_d: 'ref004_D'

            }
            const timeAndDate = new Date().toLocaleString()
            console.log(timeAndDate);
            const payMentInfo = {
                cusEmail: payInfo.email,
                cusName: payInfo.cardHolder,
                cusImg: payInfo.imgCu,
                payStatus: 'Pending',
                amount: payInfo.amount,
                transactionID,
                timeAndDate,
            }

            const cretePay = await paymentCollection.insertOne(payMentInfo)

            const result = await axios({
                method: 'POST',
                url: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
                data: paymentInit,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })

            console.log(result);
            res.send({
                paymentUrl: result.data.GatewayPageURL
            })
        })

        app.post('/success-payment', async (req, res) => {
            const payment = req.body
            const email = req.query.email
            console.log('success', payment);


            const query = { myEmail: { $regex: email } };
            const result = await cartCollection.deleteMany(query);
            console.log(result);

            const filter = { transactionID: payment.tran_id };
            const updateDoc = {
                $set: {
                    payStatus: 'Success',
                    cardType: payment.card_issuer
                },
            };
            const resUp = await paymentCollection.updateOne(filter, updateDoc)
            console.log(resUp);

            const stpFi = { stepEmail: email }
            const upStpDoc = {
                $set: {
                    status: 'success'
                },
            };
            const resStep = await stepsCollection.updateOne(stpFi, upStpDoc)

            res.redirect('http://localhost:5173/payment/success')
        })

        app.post('/fail-payment', async (req, res) => {
            const payment = req.body
            const filter = { transactionID: payment.tran_id };
            const updateDoc = {
                $set: {
                    payStatus: 'Failed',
                    cardType: payment.card_issuer
                },
            };
            const resUp = await paymentCollection.updateOne(filter, updateDoc)
            console.log(resUp);
            // console.log('fail', payment);
            res.redirect('http://localhost:5173/payment/fail')
        })

        app.post('/cancel-payment', async (req, res) => {
            const payment = req.body
            const filter = { transactionID: payment.tran_id };
            const updateDoc = {
                $set: {
                    payStatus: 'Cancel',
                    cardType: payment.card_issuer
                },
            };
            const resUp = await paymentCollection.updateOne(filter, updateDoc)
            console.log(resUp);

            res.redirect('http://localhost:5173/payment/cancel')
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

        app.delete('/pay-step', async (req, res) => {
            const email = req.query.email
            const query = {
                stepEmail: email
            }
            const result = await stepsCollection.deleteOne(query)
            res.send(result)
        })

        app.get('/products', async (req, res) => {
            const result = await productCollection.find().toArray()
            res.send(result)
        })

        app.get('/pay-setp', async (req, res) => {
            const result = await stepsCollection.find().toArray()
            res.send(result)
        })

        app.get('/user', async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        app.get('/my-carts', async (req, res) => {
            const email = req.query.email
            const query = {
                myEmail: email
            }
            const result = await cartCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/payment-his', async (req, res) => {
            // const email = req.query.email
            // console.log('object', email);
            // const query = {
            //     cusEmail: email
            // }
            const result = await paymentCollection.find().toArray()
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