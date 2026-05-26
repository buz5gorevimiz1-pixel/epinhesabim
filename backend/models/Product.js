const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({

title:{
type:String,
required:true
},

price:{
type:Number,
required:true
},

image:{
type:String,
required:true
},

description:{
type:String,
required:true
},

category:{
type:String,
default:'Genel'
},

sellerId:{
type:String,
required:true
},

sellerName:{
type:String,
required:true
},

status:{
type:String,
enum:[
'pending',
'approved',
'rejected'
],
default:'pending'
},

saleStatus:{
  type:String,
  enum:[
    'available',
    'reserved',
    'sold'
  ],
  default:'available'
},

createdAt:{
type:Date,
default:Date.now
}

});

module.exports=
mongoose.model(
'Product',
productSchema
);