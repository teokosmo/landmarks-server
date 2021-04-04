const sharp = require('sharp');

Parse.Cloud.define('hello', (req) => {
  req.log.info(req);
  return 'Hi';
}, {
  requireUser: true
});

Parse.Cloud.define('asyncFunction', async req => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  req.log.info(req);
  return 'Hi async';
});

Parse.Cloud.beforeSave('Test', () => {
  throw new Parse.Error(9001, 'Saving test objects is not available.');
});

Parse.Cloud.beforeSave('Landmark', async req => {
  const photoFile = req.object.get('photo'); // ParseFile, https://parseplatform.org/Parse-SDK-JS/api/master/Parse.File.html
  const origPhotoFile = req.original.get('photo');
  const photoIsTheSame = (photoFile && origPhotoFile && (photoFile.url() === origPhotoFile.url()));
  if (photoFile && !photoIsTheSame) {
    const photoFileResponse = await Parse.Cloud.httpRequest({
      url: photoFile.url()
    });
    const photoFileResponseBuffer = photoFileResponse.buffer;

    const photoThumbFileName = `thumb${photoFile.name().substr(photoFile.name().indexOf('_'))}`;
    const photoThumbBuffer = await sharp(photoFileResponseBuffer).resize(250, 250).toBuffer();
    const photoThumbParseFile = new Parse.File(photoThumbFileName, { base64: photoThumbBuffer.toString('base64') });
    const photoThumbParseFileSaved = await photoThumbParseFile.save();
  
    req.object.set('photo_thumb', photoThumbParseFileSaved);
  }
});

Parse.Cloud.afterSave('Landmark', async req => {
});

// Parse.Cloud.beforeFind('Landmark', (req) => {
//   const query = req.query;
//   const queryJSON = query.toJSON(); // https://parseplatform.org/Parse-SDK-JS/api/master/Parse.Query.html#toJSON
//   const queryKeysFindAllObjects = ['objectId', 'createdAt', 'updatedAt', 'title', 'short_info', 'photo_thumb', 'order'];
//   const queryKeysFindSingleObject = ['objectId', 'createdAt', 'updatedAt', 'title', 'short_info', 'photo_thumb', 'order', 'description', 'url'];
//   const queryWithObjectId = queryJSON.where && queryJSON.where.objectId;

//   let queryKeys = queryKeysFindAllObjects;
//   if (queryWithObjectId) {
//     queryKeys = queryKeysFindSingleObject;
//   }
//   query.select(queryKeys);
// });

Parse.Cloud.afterFind('Landmark', async req => {
  if (req.master) { // request from parse-dashboard, return everything
    return req.objects;
  }
  const query = req.query;
  const queryJSON = query.toJSON(); // https://parseplatform.org/Parse-SDK-JS/api/master/Parse.Query.html#toJSON
  const queryWithObjectId = queryJSON.where && queryJSON.where.objectId;
  const objAttributes2Remove = ['ACL'];

  if (!queryWithObjectId) {
  // remove attributes when NOT selecting a specific object
    objAttributes2Remove.push('description', 'photo');
  }

  // create new objects list with attributes removed
  const newObjects = [];
  req.objects.forEach(obj => {
    const objToJSON = obj.toJSON();
    objAttributes2Remove.forEach(attr => {
      delete objToJSON[attr];
    });
    objToJSON.className = obj.className;
    newObjects.push(Parse.Object.fromJSON(objToJSON));
  });

  return newObjects;
});
