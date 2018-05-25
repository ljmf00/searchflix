#!/usr/bin/env node

process.title = "searchflix";

const express = require('express')
const tor = require('granax')();
const torrentStream = require('torrent-stream');
const stream_transcoder = require('stream-transcoder');
const path = require('path');
const torrentz = require('torrentz2');

var webapp = express();

webapp.set('port', (process.env.PORT || 5000));
webapp.use(express.static(__dirname + '/public'));
webapp.set('views', __dirname + '/web/views');

webapp.set('view engine', 'ejs');
webapp.get('/', function(req, res) {
	if (req.query.query)
	{
		if (req.query.query.search("magnet:") > -1)
		{
			res.redirect(`/stream/?magnet="${req.query.query}"`);
		}
		else
			torrentz.searchTorrentz2(req.query.query).then(function (ret) {
				res.render('pages/search', {query: ret});
			});
	}
	else
	{
		res.render('pages/index');
	}
});

webapp.post('/webplayer/', function (req, res) {
	res.render('pages/player');
});

webapp.get('/stream/', function (req, res) {
	console.log("Stream query: ", req.query);
	if (req.query.magnet)
	{
		console.log(`Streaming torrent from magnet link ${req.query.magnet}`);
		var engine = torrentStream(req.query.magnet);
		engine.on('ready', function() {
			engine.files.forEach(function(file) {
				var fileext = path.parse(file.name).ext;
				if (fileext == ".mp4")
				{
					res.setHeader("content-type", "video/mp4");
					console.log(`Streaming ${file.name}`);
					file.createReadStream().pipe(res);
				}
				else if (fileext == ".webm")
				{
					res.setHeader("content-type", "video/webm");
					console.log(`Streaming ${file.name}`);
					file.createReadStream().pipe(res);
				}	
				else if (fileext == ".mkv")
				{
					res.setHeader("content-type", "video/mp4");
					console.log(`Streaming ${file.name}`);
					var stream = file.createReadStream();
					console.log(`Transcoding ${file.name} to a video/mp4 stream`);
					stream_transcoder(stream).format('mp4').stream().pipe(res);
				}
				
			});
		});
	}
	else {
		res.send("invalid query");
	}
});

webapp.listen(webapp.get('port'), function () {
	console.log(`Node app is running on port ${webapp.get('port')}`);
	console.log(`Starting a tor web instance on same web instance port: ${webapp.get('port')}...`);
	tor.on('ready', function () {
		if (process.env.SEARCHFLIX_TOR_KEYBLOB)
			tor.createHiddenService(`127.0.0.1:${webapp.get('port')}`, {
				clientName: null,
				clientBlob: null,
				virtualPort: 80,
				keyType:"RSA1024",
				keyBlob: process.env.SEARCHFLIX_TOR_KEYBLOB,
				discardPrivateKey: false,
				detach: false,
				basicAuth: false,
				nonAnonymous: false
			}, (err, result) => {
				if(err) console.log(err);
				console.log(`Service is running on following tor URL: ${result.serviceId}.onion`);
			});
	});
});
 
tor.on('error', function(err) {
  console.error(err);
});