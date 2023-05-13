var express = require("express");
const fs = require('fs')
const path = require('path')
var app = express();
app.use(express.static('./'))
const port = process.env.PORT || 3000

//
// app.engine('html', require('/public/index.html'))
// app.set('view options', {
//     debug: process.env.NODE_ENV !== 'production'
// })
//
// // app.use(express.static("public")).listen(8080);
app.listen(port, () => {console.log(`程序已启动，端口号为${port}`)})

