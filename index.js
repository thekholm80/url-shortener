const express = require('express');
const mongodb = require('mongodb');
const validUrl = require('valid-url');
const app = express();
const MongoClient = mongodb.MongoClient;
const dbUrl = process.env.SHORTENER_APP_MONGOLAB_URI;

const addNew = (param, addNewCallback) => {
  let json = {};

  if (validUrl.isUri(param)) {
    MongoClient.connect(dbUrl, (error, db) => {
      if (error) throw error;

      const collection = db.collection('shortUrls');

      collection.find({
        originalUrl: param
      }).toArray( (error, documents) => {
        if (error) throw error;

        if (documents.length > 0) {
          db.close();

          json = {
            "original_url": documents[0].originalUrl,
            "short_url": "https://thekholm80-url-shortener.herokuapp.com/" + documents[0].key
          };

          addNewCallback(json);
        } else {
          collection.find()
                    .sort({ key: -1 })
                    .limit(1)
                    .toArray( (error, docs) => {
                      if (error) throw error;

                      if (docs.length > 0) {
                        const newKey = parseInt(docs[0].key) + 1;

                        json = {
                          "original_url": param,
                          "short_url": "https://thekholm80-url-shortener.herokuapp.com/" + newKey
                        };

                        collection.insert({
                          "key": newKey.toString(),
                          "originalUrl": param
                        });

                        db.close();
                        addNewCallback(json);
                      } else {
                        db.close();

                        json = {
                          "error": "something went wrong"
                        };

                        addNewCallback(json);
                      }
                    });
        }
      });
    });
  } else {
    json = {
      "error": "invalid URL"
    };

    addNewCallback(json);
  }
}

const checkRedirect = (param, redirectCallback) => {
  MongoClient.connect(dbUrl, (error, db) => {
    if (error) throw error;

    const collection = db.collection('shortUrls');

    collection.find({
      key: param
    }).toArray( (error, documents) => {
      if (error) throw error;

      if (documents.length > 0) {
        db.close();
        redirectCallback(true, documents[0].originalUrl);
      } else {
        const json = { "error": "URL Not Found" };

        redirectCallback(false, json);
      }
    });
  });
}

app.set('port', (process.env.PORT || 8000));

app.use(express.static(__dirname + '/public'));

app.get('/', (request, response) => {
  response.sendFile( __dirname + '/public/' + 'index.html');
});

app.get('/new/*', (request, response) => {
  const param = request.params[0];

  const addNewCallback = (myResponse) => {
    response.send(myResponse);
  }

  addNew(param, addNewCallback);
});

app.get('/:id', (request, response) => {
  const param = request.params.id;

  const redirectCallback = (isGood, myResponse) => {
    if (isGood) {
      response.redirect(301, myResponse);
    } else {
      response.send(myResponse);
    }
  }

  checkRedirect(param, redirectCallback);
});

app.listen(app.get('port'), () => {
  console.log('Node app is running on port', app.get('port'));
});
