module.exports = function() {
  return function(stylus) {
    stylus.define('toLowerCase', function(node) {
      var nodeName = node.nodeName
        , val = node.string;

      if ('string' == nodeName) {
        return new stylus.nodes.String(val.toLowerCase());
      } else if ('ident' == nodeName) {
        return new stylus.nodes.Ident(val.toLowerCase());
      } else {
        throw new Error('toLowerCase accepts string or ident but got "' + nodeName + '"');
      }
    });
  };
};
