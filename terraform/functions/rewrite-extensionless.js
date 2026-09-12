function serializeQuery(querystring) {
  var pairs = [];
  Object.keys(querystring || {}).forEach(function (name) {
    var field = querystring[name];
    var values = field.multiValue && field.multiValue.length ? field.multiValue : [field];
    values.forEach(function (entry) {
      pairs.push(name + '=' + entry.value);
    });
  });
  return pairs.join('&');
}

function localRedirectPath(uri) {
  var path = uri.replace(/\/+$/, '').replace(/\\/g, '%5C');
  if (path.charAt(0) !== '/') {
    path = '/' + path;
  }
  if (path.indexOf('//') === 0) {
    path = '/%2F' + path.slice(2);
  }
  return path;
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri === '/') {
    request.uri = '/index.html';
    return request;
  }
  if (uri.endsWith('/')) {
    var query = serializeQuery(request.querystring);
    return {
      headers: {
        location: {value: localRedirectPath(uri) + (query ? '?' + query : '')},
      },
      statusCode: 308,
      statusDescription: 'Permanent Redirect',
    };
  }
  if (!uri.split('/').pop().includes('.')) {
    request.uri = uri + '.html';
  }
  return request;
}
