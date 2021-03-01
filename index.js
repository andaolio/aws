const AWS = require('aws-sdk');
AWS.config.update(  {
    region: 'sa-east-1'
});
const dynamodb = new AWS.DynamoDB.DocumentClient.Client();
const dynamodbTableName = 'cartas-de-natal';
const healthPath = '/health';
const cartaPath = '/carta';
const cartasPath = '/cartas';

exports.handler = async function(event) {
    console.log('Request event: ', event);
    let response;
    switch(true)    {
        case event.httpMethod === 'GET' && event.path === healthPath:
            response = buildResponse(200);
            break;
        case event.httpMethod === 'GET' && event.path === cartaPath:
            response = await getCarta(event.queryStringParameters.cartaid);
            break;
        case event.httpMethod === 'GET' && event.path === cartasPath:
            response = await getCartas();
            break;
        case event.httpMethod === 'POST' && event.path === cartaPath:
            response = await saveCarta(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PATCH' && event.path === cartaPath:
            const requestBody = JSON.parse(event.body);
            response = await modifyCarta(requestBody.cartaid, requestBody.updateKey, requestBody.updateValue);
            break;
        case event.httpMethod === 'DELETE' && event.path === cartaPath:
            response = await deleteCarta(JSON.parse(event.body).cartaid);
            break;
        default:
            response = buildResponse(404, '404 not found');
    }
    return response;
}

async function getCarta(cartaid) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'cartaid': cartaid
        }
    }
    return await dynamodb.get(params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (errir) => {
        console.error('Erro!!!', error);
    });
}

async function getCartas() {
    const params = {
        TableName: dynamodbTableName,
    }
    const allCartas = await scanDynamoRecords(params, []);
    const body = {
        cartas: allCartas
    }
    return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
    try {
      const dynamoData = await dynamodb.scan(scanParams).promise();
      itemArray = itemArray.concat(dynamoData.Items);
      if (dynamoData.LastEvaluatedKey) {
        scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
        return await scanDynamoRecords(scanParams, itemArray);
      }
       
      return itemArray;
    } catch(error) {
      console.error('Erro!!!', error);
    }
}

async function saveCarta(requestBody) {
    const params = {
      TableName: dynamodbTableName,
      Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
      const body = {
        Operation: 'SALVAR',
        Message: 'SUCESSO',
        Item: requestBody
      }
      return buildResponse(200, body);
    }, (error) => {
      console.error('Erro!!!', error);
    })
}

async function modifyCarta(cartaid, updateKey, updateValue) {
    const params = {
      TableName: dynamodbTableName,
      Key: {
        'cartaid': cartaid
      },
      UpdateExpression: `set ${updateKey} = :value`,
      ExpressionAttributeValues: {
        ':value': updateValue
      },
      ReturnValues: 'ATUALIZADO'
    }
    return await dynamodb.update(params).promise().then((response) => {
      const body = {
        Operation: 'ATUALIZAR',
        Message: 'SUCESSO',
        UpdatedAttributes: response
      }
      return buildResponse(200, body);
    }, (error) => {
      console.error('Erro!!!', error);
    })
}

async function deleteCarta(cartaid) {
    const params = {
      TableName: dynamodbTableName,
      Key: {
        'cartaid': cartaid
      },
      ReturnValues: 'PEDIDO CONCLUIDO'
    }
    return await dynamodb.delete(params).promise().then((response) => {
      const body = {
        Operation: 'DELETAR',
        Message: 'SUCESSO',
        Item: response
      }
      return buildResponse(200, body);
    }, (error) => {
      console.error('ERRO!!!', error);
    })
}

function buildResponse(statusCode, body)    {
    return {
        statusCode: statusCode,
        headers: {
            'content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }
}
