// Adds Object.get function
// +pathstr+ is a string of dot-separated nested properties on +ojb+
// returns undefined if any of the properties do not exist
// returns the value of the last property otherwise
//
// Object.get({"foo": {"bar": 123}}, "foo.bar"); // 123
// Object.get({"foo": {"bar": 123}}, "bar.foo"); // undefined
Object.get = function(obj, pathstr) {
  var path = pathstr.split(".");
  var result = obj;

  for (var i = 0; i < path.length; i++) {
    var key = path[i];
    if (!result || !Object.prototype.hasOwnProperty.call(result, key)) {
      return undefined;
    } else {
      result = result[key];
    }
  }

  return result;
};