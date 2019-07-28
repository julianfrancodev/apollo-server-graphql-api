import {Clients, Orders, Products, Users} from "./db";
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

const ObjectId = mongoose.Types.ObjectId;

dotenv.config(({path: 'variables.env'}));

const createToken = (userLogin, secret, expiresIn) => {
    const {username} = userLogin;

    return jwt.sign({username}, secret, {expiresIn});
};


export const resolvers = {
    Query: {
        getClients: (root, {limit,seller}) => {
            let filter;

            if(seller){
                filter = {seller: new ObjectId(seller)}
            }
            return Clients.find(filter).limit(limit);
        },

        getClient: (root, {id}) => {
            return Clients.findById({_id: id})
        },

        getProducts: (root, {limit}) => {
            return Products.find({}).limit(limit);
        },

        getProduct: (root, {id}) => {
            return Products.findById({_id: id})
        },

        getOrders: (root, {client}) => {
            return new Promise((resolve, object) => {
                Orders.find({client: client}, (error, order) => {
                    if (error) rejects(error);
                    else resolve(order);
                })
            })
        },

        getUser: (root, args, userUp) => {
            if (!userUp) {
                return null;
            }
            return Users.findOne({username: userUp.username});

        },

        getOrder: (root, {id}) => {
            return Orders.findById({_id: id})
        },
        topClients: (root) => {
            return new Promise((resolve, object) => {
                Orders.aggregate([
                    {
                        $match: {state: "SUCCESS"}
                    },

                    {

                        $group: {
                            _id: "$client",
                            total: {$sum: "$total"}
                        }

                    },

                    {
                        $lookup: {
                            from: "clients",
                            localField: '_id',
                            foreignField: '_id',
                            as: 'client'
                        }
                    },
                    {
                        $sort: {total: -1}
                    },
                    {
                        $limit: 10
                    }
                ], (error, result) => {
                    if (error) rejects(error);
                    else resolve(result)
                })
            })
        }
    },
    Mutation: {

        /*CREATE CLIENT*/

        createClient: (root, {input}) => {
            const newClient = new Clients({
                name: input.name,
                age: input.age,
                lastname: input.lastname,
                company: input.company,
                emails: input.emails,
                type: input.type,
                orders: input.orders,
                seller:input.seller
            });

            newClient.id = newClient._id;

            return new Promise((resolve, object) => {
                newClient.save((error) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve(newClient)
                    }
                })
            });
        },

        /*UPDATE CLIENT */

        updateClient: (root, {input}) => {
            return new Promise((resolve, object) => {
                Clients.findOneAndUpdate({_id: input.id}, input, {new: true}, (error, client) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve(client)
                    }
                });
            });
        },

        /* DELETE CLIENT*/

        deleteClient: (root, {id}) => {
            return new Promise((resolve, object) => {
                Clients.findOneAndRemove({_id: id}, (error) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve("client deleted successfully")
                    }
                });
            });
        },

        /* CREATE PRODUCT */

        createProduct: (root, {input}) => {
            const newProduct = new Products({
                name: input.name,
                price: input.price,
                stock: input.stock
            });

            newProduct.id = newProduct._id;

            return new Promise((resolve, object) => {
                newProduct.save((error) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve(newProduct)
                    }
                })
            });
        },

        /*UPDATE Product */

        updateProduct: (root, {input}) => {
            return new Promise((resolve, object) => {
                Products.findOneAndUpdate({_id: input.id}, input, {new: true}, (error, product) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve(product)
                    }
                });
            });
        },

        /* DELETE PRODUCT*/

        deleteProduct: (root, {id}) => {
            return new Promise((resolve, object) => {
                Products.findOneAndRemove({_id: id}, (error) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve("product deleted successfully")
                    }
                });
            });
        },

        /* CREATE ORDER */

        createOrder: (root, {input}) => {
            const newOrder = new Orders({
                order: input.order,
                total: input.total,
                date: new Date(),
                client: input.client,
                state: 'PENDING'
            });

            newOrder.id = newOrder._id;

            return new Promise((resolve, object) => {

                // update the quantity

                input.order.forEach(order => {

                    Products.updateOne({_id: order.id},
                        {
                            "$inc": {"stock": -order.quantity}
                        }, function (error) {
                            if (error) return new Error(error);
                        }
                    );
                });
                newOrder.save((error) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve(newOrder)
                    }
                })
            });
        },

        /*UPDATE ORDER */

        updateOrder: (root, {input}) => {
            return new Promise((resolve, object) => {


                const {state} = input;

                let operator;

                if (state === 'SUCCESS') {
                    operator = '-';
                } else if (state === 'CANCELED') {
                    operator = '+'
                }

                input.order.forEach(order => {

                    Products.updateOne({_id: order.id},
                        {
                            "$inc": {"stock": ` ${operator}${order.quantity}`}
                        }, function (error) {
                            if (error) return new Error(error);
                        }
                    );
                });
                Orders.findOneAndUpdate({_id: input.id}, input, {new: true}, (error, order) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve(order)
                    }
                });
            });
        },

        /*UPDATE ORDER */

        createUser: async (root, {username, password, nameUser, rol}) => {

            const isValidUser = await Users.findOne({username});

            if (isValidUser) {
                throw new Error('Invalid User Name');
            }

            const newUser = await new Users({
                username,
                password,
                nameUser,
                rol
            }).save();

            return "Created Successfully";
        },


        authUser: async (root, {username, password}) => {
            const userName = await Users.findOne({username});

            if (!userName) {
                throw new Error('User not found');
            }

            const successPass = await bcrypt.compare(password, userName.password);

            if (!successPass) {
                throw new Error("Incorrect Password")
            }

            return {
                'token': createToken(userName, process.env.SECRET, '1hr')
            }
        }


    }
};
