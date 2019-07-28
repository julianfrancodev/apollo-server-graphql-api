import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

mongoose.Promise = global.Promise;

mongoose.connect('mongodb://localhost/clients', {useNewUrlParser: true, useFindAndModify: false});

const clientsSchema = new mongoose.Schema({
    name: String,
    lastname: String,
    company: String,
    emails: Array,
    age: String,
    type: String,
    orders: Array,
    seller:mongoose.Types.ObjectId
});

const productsSchema = new mongoose.Schema({
    name: String,
    price: Number,
    stock: Number
});

const ordersSchema = new mongoose.Schema({
    order: Array,
    total: Number,
    date: Date,
    client: mongoose.Types.ObjectId,
    state: String
});

const userSchema = new mongoose.Schema({
    username: String,
    nameUser: String,
    password: String,
    rol: String
});

userSchema.pre('save', function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    bcrypt.genSalt(10, (error, salt) => {
        if (error) return next();
        bcrypt.hash(this.password, salt, (err, hash) => {
            if (error) return next();
            this.password = hash;
            next();
        })
    })
});

var Products = mongoose.model('products', productsSchema),
    Clients = mongoose.model('clients', clientsSchema),
    Orders = mongoose.model('orders', ordersSchema),
    Users = mongoose.model('users', userSchema);

export {Clients, Products, Orders, Users};
