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

categorySlug:{
type:String,
default:'genel'
},

categoryName:{
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
'rejected',
'active',
'hidden',
'removed',
'sold'
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

stock:{
  type:Number,
  default:1
},

vitrin:{
  type:Boolean,
  default:false
},

featured:{
  type:Boolean,
  default:false
},

guncelIlan:{
  type:Boolean,
  default:false
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