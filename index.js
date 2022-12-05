const express = require('express');
const cors = require('cors');
const port = 5000
require('dotenv').config()
const jwt = require('jsonwebtoken');

const app = express()

app.use(cors())
app.use(express.json())
const stripe = require("stripe")(process.env.STRIPE_SECRET);


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express');
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.fpgnyx0.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {

        const productsCollection = client.db('ShopNowProducts').collection('products');
        const catagoryCollection = client.db('ShopNowCatagory').collection('catagrory');
        const orderCollection = client.db('ShopNowOrders').collection('orders')
        const usersCollection = client.db('ShopNowOrders').collection('users')
        const PaymentCollection = client.db('ShopNowOrders').collection('payments')


        // save use to db

        // implement  jwt toaken
        app.put("/user/:email", async (req, res) => {
            try {
                const email = req.params.email;

                // check the req
                const query = { email: email }
                const existingUser = await usersCollection.findOne(query)

                if (existingUser) {
                    const token = jwt.sign(
                        { email: email },
                        process.env.ACCESS_TOKEN_SECRET,
                        { expiresIn: "1d" }
                    )
                    console.log('user Exist ');
                    return res.send({ data: token })
                }

                else {

                    const user = req.body;
                    const filter = { email: email };
                    const options = { upsert: true };
                    const updateDoc = {
                        $set: user
                    }
                    const result = await usersCollection.updateOne(filter, updateDoc, options);

                    // token generate 
                    const token = jwt.sign(
                        { email: email },
                        process.env.ACCESS_TOKEN_SECRET,
                        { expiresIn: "1d" }
                    )
                    console.log('user created')
                    return res.send({ data: token })

                }



            }
            catch (err) {
                console.log(err)
            }
        })
        app.get('/users', async (req, res) => {
            const query = {}
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })



        //loding catagory
        app.get('/catagory', async (req, res) => {

            const query = {}
            const cursor = catagoryCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })
        // loading data catagorywise
        app.get('/catagory/:id', async (req, res) => {
            const id = req.params.id;
            let query = {}
            if (id === '00') {
                query = {}
            }
            else {
                query = {
                            category_id:id
                        }
                
            }
            const cursor = productsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

       

        // loading all products
        app.get('/products/:id', async (req, res) => {
            const page = req.query.page
            const size = parseInt(req.query.size)
            const id = req.params.id
           
            let query = {}
            if (id === '08') {
                query = {}
            }
            else {
                query = {
                            category_id:id
                        }
                
            }
            const cursor = productsCollection.find(query)
            const products = await cursor.skip(page * size).limit(size).toArray()
            const count = await productsCollection.estimatedDocumentCount()
            res.send({ count, products })

        })
        //loading single product
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const cursor = productsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

      




        // ---------------------Order API --------------------

        app.post('/order', async (req, res) => {
            const body = req.body;
            const result = await orderCollection.insertOne(body);
            res.send(result)
        })
        app.get('/order', async (req, res) => {
            const email = req.query.email;
            let query = {}
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders)
        })


      

        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(query);
            res.send(result)
        })
        app.delete('/clear', async (req, res) => {
            const email = req.query.email
            const query = {
                email: email
            }
            const result = await orderCollection.deleteMany(query)
            res.send(result)
        })
        // -------------- Payments ----------
        app.post("/create-payment-intent", async (req, res) => {
            const order = req.body;
            // console.log('api hit',req.headers)
            const price = order.grandTotal;
            const amount = price * 100;
      
            const paymentIntent = await stripe.paymentIntents.create({
              currency: "usd",
              amount: amount,
      
              "payment_method_types": ["card"],
            });
            res.send({
              clientSecret: paymentIntent.client_secret,
            });
          });

        // payment 
        app.post('/payments', async (req, res) => {
            const body = req.body;
            const result = await PaymentCollection.insertOne(body)
            res.send(result)
        
        })


        // app.get('/delete', async (req, res) => {
        //     const query = {}
        //     const result = await PaymentCollection.deleteMany(query)
        //     res.send(result)
        
        // })

        app.get('/delivery', async (req, res) => {
            const email = req.query.email;
            const query = {
                buyerEmail: email
            }
            const result = await PaymentCollection.find(query).toArray()
            res.send(result);
        })

        app.put('/payments/:id', async (req, res) => {
            const id = req.params.id
            const filter = {
                _id:ObjectId(id)
            }
            // const order = await PaymentCollection.findOne(query)
            
            
            // const ordersid = order.orders.map(order => {
            //    order._id
            // })
            // const deleteQuery = {
            //     _id:ObjectId(ordersid)
            // }
            // const deleteOrder = await orderCollection.deleteMany(deleteQuery)
            // console.log(ordersid)
           
            
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    paid:'true'
                }
            }

            const result = await PaymentCollection.updateOne(filter,updateDoc,option);
            res.send(result)
        })
        app.get('/payments/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {
                _id:ObjectId(id)
            }
            const result = await PaymentCollection.findOne(query);
            res.send(result)
        })



    }
    finally {

    }

}

run().catch(err => console.error(err))

app.get('/', (req, res) => {
    res.send('Server is Running ')
})

app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})