const Parse = require("parse/lib/node/Parse");

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

Parse.Cloud.beforeSave('Landmark', req => {
  req.log.info('beforeSave Landmark');
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
