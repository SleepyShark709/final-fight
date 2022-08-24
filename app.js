var express = require("express");
const fs = require('fs')
const path = require('path')
var app = express();
app.use(express.static('./'))

//
// app.engine('html', require('/public/index.html'))
// app.set('view options', {
//     debug: process.env.NODE_ENV !== 'production'
// })
//
// // app.use(express.static("public")).listen(8080);
app.listen(3000, () => {console.log('start')})

