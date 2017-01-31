(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // the browser, add `_` as a global object.
  root._ = _;

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    return function() {
      return func.apply(context, arguments);
    };
  };


  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };


  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };


  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = optimizeCb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };


  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };


  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };


  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);

  // Object Functions
  // ----------------

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };


  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
         console.log("87")
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;
}.call(this));

/**
* My js app
*
* @module pga
*/

/** @namespace Namespace for PGA classes and functions. */
var PGA = PGA || {};


var $helper = null;
var $helperParent = $('.cntnt');

var modalWrapper = document.getElementById("modal_wrapper");
var modalWindow = document.getElementById("modal_window");

PGA.draglabel = false;
PGA.mouseOnEditor = false;

PGA.canCreateNode = false;


PGA.dragFnBx = false;

PGA.edgeInfoFnBx = {};
PGA.tempClassifiers = [];

PGA.dragLabelname = null;

PGA.labelTreeJSON = {
    "label_tree": {
        "lastNodeId":"",
        "nodeData": []
    }
};
PGA.nodeShape = null;

PGA.fnBxParams = {};

PGA.dialogOpen = false;

/**
* @method PGA.LabelTree
* @param {String} svg container
* @param {Object} data for label tree
* @param {Boolean} true if editable false if non-editable
* @param {Boolean} true if draggable false if non-draggable
//* @return {Boolean} Returns true on success
*/

PGA.LabelTreeViewer = function(svgDiv,labelTreeSpec, editable){
    function expand(d){
      var children = (d.children)?d.children:d._children;
      if (d._children) {
          d.children = d._children;
          d._children = null;
      }
      if(children)
        children.forEach(expand);
    }

    function expandAll(){
      expand(root);
      update(root);
    }

    function collapseAll(){
      root.children.forEach(collapse);
      collapse(root);
      update(root);
    }

    var margin = {top: 50, right: 120, bottom: 20, left: 120},
      width = $( "#"+svgDiv ).outerWidth() - margin.right - margin.left,
      height = 400 - margin.top - margin.bottom;

    var i = 0,
      duration = 200,
      root,root2;

    var lastNodeId = 0;

    var rx = 34.6,
        ry = rx*.6;

    var tree = d3.layout.tree()
      .size([height, width]);


    // mouse event vars
    var selected_tree_node = null,
        selected_tree_link = null,
        mousedown_tree_link = null,
        mousedown_tree_node = null,
        mouseup_tree_node = null,
        mousedown_dailog = null,
        edgeSource = null,
        edgetarget = null,
        edgeDirection = null;

    this.resetMouseVars = function() {
        mousedown_tree_node = null;
        mouseup_tree_node = null;
        mousedown_tree_link = null;
        mousedown_dailog = null;
    }


    var diagonal = d3.svg.diagonal()
      .projection(function(d) { return [d.x, d.y]; });

    var svg = d3.select("#"+svgDiv).append("svg")
      .attr("width", width + margin.right + margin.left -20)
      //set svg height based on # of trees
      .attr("height", (height*labelTreeSpec.length) + margin.top + margin.bottom)

    var dragLabel = d3.behavior.drag()
        .on('dragstart', function (d) {
            PGA.nodeShape = 'circle';
            PGA.draglabel = true;
            PGA.dragLabelname = d.name;
            d3.event.sourceEvent.stopPropagation();
            d3.event.sourceEvent.preventDefault();

            var $svgHelper = $('<svg id="helperSvg" width="' + (rx * 2 + 2) + '" height="' + (ry * 2 + 2) + '"></svg>').attr('xmlns', 'http://www.w3.org/2000/svg');
            $svgHelper.html(this.innerHTML)

            $helper = $svgHelper.appendTo($helperParent)
            $('#helperSvg ellipse').attr('cx', rx + 1)
            $('#helperSvg ellipse').attr('cy', ry + 1)
            $('#helperSvg text').attr('x', rx)
            $('#helperSvg text').attr('y', ry)
        })
        .on('drag', function (d, i) {
            PGA.draglabel = true;
            PGA.canCreateNode = true;
            d.cx += d3.event.dx;
            d.cy += d3.event.dy;
            d3.select(this).attr('cx', d.cx).attr('cy', d.cy)

            mousepos = d3.mouse($helperParent[0])

            // update the helper's position
            $helper.css({
                left: mousepos[0]+70,
                top: mousepos[1]+25
            });
        })
        .on('dragend', function (d, event) {
            mousepos = d3.mouse($helperParent[0])

            $helper.remove();

            if (PGA.mouseOnEditor && PGA.draglabel) {
                PGA.canCreateNode = true;
                PolicyGraphs.prototype.createNode(mousepos[0] - $('#graphEditor').offset().left, mousepos[1] - $('#graphEditor').offset().top, d.name);
                PGA.mouseOnEditor = false;
                PGA.draglabel = false;
            }

        });


    function update(x,labelTreeSpec,source) {

      var currentTree = svg.append("g")
          .attr("id", function(){
            if(editable){
              return "editabletree_"+x;
            }else{
              return "tree_"+x;
            }
          })
          .attr("transform", "translate(" + -30 + "," + (margin.top+x*400) + ")");



      var data = labelTreeSpec.label_tree.nodeData;

      for(var i=0;i<data.length;i++){

      }

      // *********** Convert flat data into a nice tree ***************
      // create a name: node map
      var dataMap = data.reduce(function(map, node) {
          map[node.nodeId] = node;
          return map;
      }, {});

      // create the tree array

      var treeData = [];
      data.forEach(function(node) {
          // add to parent
          var parent = dataMap[node.parent];
          //console.log(parent);
          if (parent) {
              // create child array if it doesn't exist
              (parent.children || (parent.children = []))
                  // add node to child array
                  .push(node);
          } else {
              // parent is null or missing
              treeData.push(node);
          }
      });


      root = treeData[0];

      root.x0 = height / 2;
      root.y0 = 0;

      if(source == undefined){
        source = root;
      }

        // Compute the new tree layout.
      var nodes = tree.nodes(root).reverse(),
          links = tree.links(nodes);

      // Normalize for fixed-depth.
      nodes.forEach(function(d) { d.y = d.depth * 100; });

      // Update the nodes…
      var node = currentTree.selectAll("g.node")
          .data(nodes, function(d) { return d.id || (d.id = ++i); });

      // Enter any new nodes at the parent's previous position.
      var nodeEnter = node.enter().append("g")
          .attr("class", "node")
          .attr("transform", function(d) { return "translate(" + source.x0 + "," + source.y0 + ")"; })
          .call(dragLabel)
          //.on("click", click)


          //.on("mouseover", mouseover)
          //.on("mouseout", mouseout)
          ////////
          .attr("id", function(d){return d.nodeId;})
          .attr("parent", function(d){
              return d.parent ? d.parent.id : null;
          })


      nodeEnter.append("ellipse")
          .attr("rx", rx)
          .attr("ry", ry)
          .attr("class", "ellipse")
          .style("fill", "#fff")
          .on("click", function (d) {
              if (editable) {
                  d3.selectAll(".ellipse").style('fill', '#fff')
                  d3.select("#addNode_" + d.nodeId).style('display', 'block')
                  d3.select(this).style('fill', '#e5e5e5')
              }
          })
          .call(add_node, "name");

      nodeEnter.append("circle")
                .attr("class", "add")
                .attr("cx", 23)
                .attr("r", 7)
                .style("fill", "#D4E9A9")
                .style("display", function(d) {
                    if (d.children) {
                      return 'block';
                    } else if (d._children) {
                      return 'block';
                    } else {
                      return 'none';
                    }
                })
                .on("click", function(d) {
                  if (d.children) {
                    d._children = d.children;
                    d.children = null;
                  } else {
                    d.children = d._children;
                    d._children = null;
                  }
                  d3.select('#editabletree_'+x).remove();
                  update(x,labelTreeSpec,source);
                })

      nodeEnter.append("text")
          .attr("x", function(d) { return d.children || d._children ? 5 : -10; })
          .attr("dy", ".35em")
          .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
          .text(function(d) { return d.name; })
          .style("fill-opacity", 1e-6);
      //toggle +/-
      nodeEnter.append("text")
            .attr("class", "toggle")
            .attr("dy", ".35em")
            .attr("x", 20)

      nodeEnter.selectAll("text.toggle")
            .text(function(d) {
                if (d.children) {
                  return '-';
                } else if (d._children) {
                  return '+';
                } else {
                  return '';
                }
              })
            .style("fill-opacity", 1)
      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
          .duration(duration)
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

      nodeUpdate.select("ellipse")
          .attr("rx", rx)
          .attr("ry", ry)
          .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

      nodeUpdate.select("text")
          .style("fill-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node.exit().transition()
          .duration(duration)
          .attr("transform", function(d) { return "translate(" + source.x + "," + source.y + ")"; })
          .remove();

      nodeExit.select("ellipse")
          .attr("rx", rx)
          .attr("ry", ry);

      nodeExit.select("text")
          .style("fill-opacity", 1e-6);

      // Update the links…
      var link = currentTree.selectAll("path.link")
          .data(links, function(d) { return d.target.id; });

      // Enter any new links at the parent's previous position.
      link.enter().insert("path", "g")
          .attr("class", "link")
          .attr("d", function(d) {
            var o = {x: source.x0, y: source.y0};
            return diagonal({source: o, target: o});
          });


      // Transition links to their new position.
      link.transition()
          .duration(duration)
          .attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
          .duration(duration)
          .attr("d", function(d) {
            var o = {x: source.x, y: source.y};
            return diagonal({source: o, target: o});
          })
          .remove();

      // Stash the old positions for transition.
      nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });

      //update(tree.nodes(nodes[0]).reverse(), tree.links(nodes));
      function add_node(d) {
          this.on("dblclick", function(d) {
            if(editable){
              lastNodeId++;
              var a = {"nodeId":lastNodeId,"name": "xyz", "mother":d.nodeId},
                  p = nodes[0];
              if(d.children)
              {
                  d.children.push(a);
              } else {
                  d.children = [a];
              }
              update(x,labelTreeSpec,source);
            }

          });
      }


    }


    var funcs = [];

    labelTreeSpec.forEach(function(labelTreeSpec,i) {
    funcs[i] = update.bind(this, i, labelTreeSpec);
    });

    labelTreeSpec.forEach(function(labelTreeSpec,j) {
    funcs[j]();
    });


    // Toggle children on click.
    function click(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
    update(d);
    }

    function mouseover(d) {
      d3.select(this).append("text")
          .attr("class", "hover")
          .attr('transform', function(d){
              return 'translate(5, -10)';
          })
          .text(d.name + ": " + d.id);
    }

    // Toggle children on click.
    function mouseout(d) {
      d3.select(this).select("text.hover").remove();
    }

    function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
    }

    d3.select(self.frameElement).style("height", "800px");

}

d3.selection.prototype.position = function() {
    var el = this.node();
    var elPos = el.getBoundingClientRect();
    var vpPos = getVpPos(el);
    function getVpPos(el) {
        if(el.parentElement.tagName === 'svg') {
            return el.parentElement.getBoundingClientRect();
        }
        return getVpPos(el.parentElement);
    }
    return {
        top: elPos.top - vpPos.top,
        left: elPos.left - vpPos.left,
        width: elPos.width,
        bottom: elPos.bottom - vpPos.top,
        height: elPos.height,
        right: elPos.right - vpPos.left
    };
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
PGA.LabelTree = function(svgDiv,labelTreeSpec, editable, draggable){
    var _self = this;
    _self.rx = 34.6;
    _self.ry = _self.rx*.6;
    _self.context = null;


    var margin = {top: 50, right: 120, bottom: 20, left: 150},
        width = 100,
        height = 600 - margin.top - margin.bottom
        i = 0,
        duration = 750;

    var lastNodeId = 1;

    var tree = d3.layout.tree()
            .size([height, width]);


    var LabelTreeParams = {};

    if(labelTreeSpec.label_tree != undefined){
        lastNodeId = labelTreeSpec.label_tree.lastNodeId;
    }


    PGA.labelTreeJSON.label_tree.lastNodeId = lastNodeId;
    var data = labelTreeSpec.label_tree.nodeData;

    for(var i=0;i<data.length;i++){
        PGA.labelTreeJSON.label_tree.nodeData.push({"nodeId":data[i].nodeId,"name": data[i].name,"parent": data[i].parent});
    }
    //console.log(JSON.stringify(PGA.labelTreeJSON))
    // *********** Convert flat data into a nice tree ***************
    // create a name: node map
    var dataMap = data.reduce(function(map, node) {
        map[node.nodeId] = node;
        return map;
    }, {});

    // create the tree array

    var treeData = [];
    data.forEach(function(node) {
        // add to parent
        var parent = dataMap[node.parent];
        //console.log(parent);
        if (parent) {
            // create child array if it doesn't exist
            (parent.children || (parent.children = []))
                // add node to child array
                .push(node);
        } else {
            // parent is null or missing
            treeData.push(node);
        }
    });



    var root = treeData[0],
            nodes = tree(root);

    //root.parent = root;
    root.x0 = 0;
    root.y0 = height / 2;



    // mouse event vars
    var selected_tree_node = null,
        selected_tree_link = null,
        mousedown_tree_link = null,
        mousedown_tree_node = null,
        mouseup_tree_node = null,
        mousedown_dailog = null,
        edgeSource = null,
        edgetarget = null,
        edgeDirection = null;

    this.resetMouseVars = function() {
        mousedown_tree_node = null;
        mouseup_tree_node = null;
        mousedown_tree_link = null;
        mousedown_dailog = null;
    }



    var diagonal = d3.svg.diagonal();

    var svg = d3.select("#"+svgDiv).append("svg")
            .attr("width", width + "%")
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var node = svg.selectAll(".node"),
        link = svg.selectAll("path");

    update(root);
    function update(source) {
        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
          links = tree.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(function(d) { d.y = d.depth * 90; });

        // Update the nodes…
        var node = svg.selectAll("g.node")
          .data(nodes, function(d) { return d.id || (d.id = ++i); });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("id", function(d){return d.id;})
            .attr("parent", function(d){return d.parent ? d.parent.id : null;})
            .attr("transform", function(d) { return "translate(" + source.x0 + "," + source.y0 + ")"; })


        nodeEnter.append("ellipse")
            .attr("rx", _self.rx)
            .attr("ry", _self.ry)
            .attr("class", "ellipse")
            .style("fill", "#fff")
            .call(add_node, "name");

        nodeEnter.append("circle")
            .attr("class", "add")
            .attr("cx", 23)
            .attr("r", 7)
            .style("fill", "#D4E9A9")
            .style("display", function(d) {
                if (d.children) {
                  return 'block';
                } else if (d._children) {
                  return 'block';
                } else {
                  return 'none';
                }
            })
            .on("click", click);

         //+/- for expand/collapse
        nodeEnter.append("text")
            .attr("class", "toggle")
            .attr("dy", ".35em")
            .attr("x", 20);

        nodeEnter.append("text")
            .attr("class", "lname")
            .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
            .attr("dy", ".35em")
            .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
            .text(function(d) { return d.name; })

        nodeEnter.selectAll("text.toggle")
            .text(function(d) {
                if (d.children) {
                  return '-';
                } else if (d._children) {
                  return '+';
                } else {
                  return '';
                }
              })
            .style("fill-opacity", 1)


        nodeEnter.on('mousedown', function (d) {
                if (d3.event.ctrlKey) return;

                if (editable) {
                    d3.selectAll(".ellipse").style('fill', '#fff');
                    d3.select("#addNode_" + d.nodeId).style('display', 'block');
                    d3.select(this).select("ellipse").style('fill', '#e5e5e5');
                }
                // select node
                mousedown_tree_node = d;
                if (mousedown_tree_node === selected_tree_node) selected_tree_node = null;
                else selected_tree_node = mousedown_tree_node;
                selected_tree_link = null;
            })

            .on('mouseup', function (d) {
                if (!mousedown_tree_node) return;
                // check for drag-to-self
                mouseup_tree_node = d;
                if (mouseup_tree_node === mousedown_tree_node) {
                    _self.resetMouseVars();
                    return;
                }
                // unenlarge target node
                d3.select(this).attr('transform', '');

                // add link to graph (update if exists)
                // NB: links are strictly source < target; arrows separately specified by booleans
                var source, target, direction;
                if (mousedown_tree_node.id < mouseup_tree_node.id) {
                    source = mousedown_tree_node;
                    target = mouseup_tree_node;
                    direction = 'right';
                } else {
                    source = mouseup_tree_node;
                    target = mousedown_tree_node;
                    direction = 'left';
                }
                edgeSource = source;
                edgeTarget = target;
                edgeDirection = direction;
            })
            .on("contextmenu", function(d, index) {
                LabelTreeParams = {id: d.id, name: d.name};
                _self.contextMenu(this, 'label', d, index, nodes);
                d3.event.preventDefault();
            });


        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
          .duration(duration)
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        nodeUpdate.select("circle")
            //.attr("rx", _self.rx)
            //.attr("ry", _self.ry)

        nodeUpdate.select("text")
          //.style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
          .duration(duration)
          .attr("transform", function(d) { return "translate(" + source.x + "," + source.y + ")"; })
          .remove();

        // Update the links…
        var link = svg.selectAll("path.link")
          .data(links, function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", function(d) {
                //return d.children || d._children ? -13 : 13;
                return "link link_"+d.source.id+" plink_"+d.target.id;
            })
            .attr("d", function(d) {
                var o = {x: source.x0, y: source.y0};
                return diagonal({source: o, target: o});
            });

        // Transition links to their new position.
        link.transition()
          .duration(duration)
          .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
          .duration(duration)
          .attr("d", function(d) {
            var o = {x: source.x, y: source.y};
            return diagonal({source: o, target: o});
          })
          .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

    }

    PGA.LabelTree.prototype.contextMenu = function(that, newContext,data) {
        if(!editable){
            return;
        }
        if (_self.context) {
            if (_self.context !== newContext) {
                console.log('current context: ' + _self.context);
                return;
            }
        }
        _self.context = newContext;

        d3.select('#context-menu')
              .style('position', 'absolute')
              .style('left', ($(that).offset().left-200) + "px")
              .style('top', ($(that).offset().top-100) + "px")
              .style('display', 'inline-block')
              .on('mouseleave', function() {
                //d3.select('#context-menu').style('display', 'none');
                //context = null;
              });
        d3.select('#context-menu').attr('class', 'menu ' + _self.context);

        if (_self.context == "label") {
            mousedown_dailog = 1;
            document.getElementById("labelname").value = data.name;
            //document.getElementById("labeldesc").value = data.description;
        }

    }

    PGA.LabelTree.prototype.updateLabelInfo = function(lname){
        var d = selected_tree_node;
        var match = _.where(nodes , {name  : d.name });
        match[0].name = lname;
        $("g #"+ d.id).find("text.lname").html(lname);
        update(d);
        _self.closeContextMenu();
    };

    PGA.LabelTree.prototype.closeContextMenu = function(){
        d3.select('#context-menu').style('display', 'none');
        _self.context = null;
    };

    // Toggle children on click.
    function click(d) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      update(d);
    }

    // Initial Display
    // Compute the new tree layout.
    //update(tree.nodes(nodes[0]).reverse(), tree.links(nodes));
    function add_node() {
        this.on("dblclick", function(d) {
            if(editable){
                lastNodeId++;
                var nId =  "id_"+lastNodeId;
                var pId =  d.nodeId;
                var a = {"nodeId":nId,"name": "Node", "parent":pId}
                PGA.labelTreeJSON.label_tree.lastNodeId= lastNodeId;
                PGA.labelTreeJSON.label_tree.nodeData.push(a);
                //var p = nodes[0];
                if(d.children)
                {
                    d.children.push({name: "Node",description:"none"});
                } else {
                    d.children = [];
                    d.children.push({name: "Node",description:"none"});
                }

                update(d);

            }
        });
    }
    function remove_node(d){
            remove_all_childs(d.id);
            remove_all_childs_in_json(d.nodeId);

            $("#"+d.id).remove();
            d3.selectAll(".plink_"+d.id).remove();


            if (d.parent && d.parent.children){
                console.log('removing ' + d.name);
                var nodetodelete = _.where(d.parent.children, {name: d.name});
                if (nodetodelete){
                    d.parent.children = _.without(d.parent.children, nodetodelete[0]);
                }
                update(d);
            }

            var match = _.where(PGA.labelTreeJSON.label_tree.nodeData , {nodeId  : d.nodeId });
            if (match){
                PGA.labelTreeJSON.label_tree.nodeData = _.without(PGA.labelTreeJSON.label_tree.nodeData, match[0]);

            }




            console.log(PGA.labelTreeJSON.label_tree.nodeData)
            update(d);
    }

    function remove_all_childs(id) {

        $('.node[parent='+id+']').each(function(){

            $('path#'+$(this).attr("id")).fadeOut("fast").remove();
            $(this).fadeOut("fast", function(e){
                this.remove();
                d3.selectAll(".link_"+id).remove();

                nodes = jQuery.grep(nodes, function(item) {
                  return item.id != id;
                });

            });
            remove_all_childs($(this).attr("id"));
        });

    }

    function remove_all_childs_in_json(id) {

        //remove from PGA.labelTreeJSON
        var matched = _.where(PGA.labelTreeJSON.label_tree.nodeData , {parent  : id });
        var nId = "";
        if (matched.length>0){

            $.each(matched, function( index, value ) {
                nId = matched[0].nodeId;

                //console.log(nId)
                PGA.labelTreeJSON.label_tree.nodeData = _.without(PGA.labelTreeJSON.label_tree.nodeData, matched[0]);
                remove_all_childs_in_json(nId);
            });

        }
    }


    function mousedownTree() {
        //console.log("mousedownTree")
        //console.log(mousedown_tree_node)
        if(!mousedown_tree_node && !mousedown_tree_link && !selected_tree_link){

        }
    }

    function mouseupTree() {
        //console.log("mouseupTree")
        if(mousedown_tree_node) {

        }
        // because :active only works in WebKit?
        svg.classed('active', false);
        // clear mouse event vars
        _self.resetMouseVars();

    }

    // only respond once per keydown
    var lastKeyDown = -1;

    function keydownTree() {
        //console.log("keydownTree")
        //d3.event.preventDefault();

        if(lastKeyDown !== -1) return;
        lastKeyDown = d3.event.keyCode;

        // ctrl
        if(d3.event.keyCode === 17) {
            circle.call(force.drag);
            svg.classed('ctrl', true);
        }

        if(!selected_tree_node && !selected_tree_link) return;
        switch(d3.event.keyCode) {
            case 8: // backspace
                return;
            case 46: // delete

                if (selected_tree_node) {
                    remove_node(selected_tree_node);

                } else if (selected_link) {
                    links.splice(links.indexOf(selected_link), 1);
                }
                selected_link = null;
                selected_node = null;
                update();
                break;


            case 66: // B
                if(selected_tree_link) {
                    // set link direction to both left and right
                    selected_tree_link.left = true;
                    selected_tree_link.right = true;
                }
                break;
            case 76: // L
                if(selected_tree_link) {
                    // set link direction to left only
                    selected_tree_link.left = true;
                    selected_tree_link.right = false;
                }
                break;
            case 82: // R
                if(selected_tree_node) {
                    // toggle node reflexivity
                    selected_tree_node.reflexive = !selected_tree_node.reflexive;
                } else if(selected_tree_link) {
                    // set link direction to right only
                    selected_tree_link.left = false;
                    selected_tree_link.right = true;
                }
                break;
        }
    }

    function keyupTree() {
        //console.log("keyupTree")
        lastKeyDown = -1;

        // ctrl
        if(d3.event.keyCode === 17) {
            circle
                .on('mousedown.drag', null)
                .on('touchstart.drag', null);
            svg.classed('ctrl', false);
        }
    }

    // app starts here
    svg.on('mousedown', mousedownTree)
        .on('mouseup', mouseupTree);
    d3.select(window)
        .on('keydown', keydownTree)
        .on('keyup', keyupTree);


};


PGA.submitLabelTree = function(){
    labeltreeJSON();
    console.log(PGA.labelTreeJSON.label_tree.nodeData)
    document.getElementById("save_tree").submit();
}


PGA.FunctionBoxes = function(svgDiv,fnBxData) {
    var _self = this;

    var width  = document.getElementById(svgDiv).offsetWidth-4,
            height = width*3;

    var fnBxWidth = 80,
        fnBxheight = 50;

    // mouse event vars
    var selected_fnBx_node = null,
        selected_fnBx_link = null,
        mousedown_fnBx_node = null,
        mouseup_fnBx_node = null,
        mousedown_dailog = null,
        edgeSource = null,
        edgetarget = null,
        edgeDirection = null;

    this.resetMouseVars = function() {
        mousedown_fnBx_node = null;
        mouseup_fnBx_node = null;
        mousedown_dailog = null;
    }

    var svgDiv = d3.select("#functionBoxes").append("svg")
            .attr("width", 270)
            .attr("height", 600)
            .append("g")
            .attr("transform", function(d) { return "translate(150,50)"; });

    var dragFnBx = d3.behavior.drag()
        .on('dragstart', function (d) {

            PGA.dragLabelname = d.name;
            PGA.nodeShape = 'rect';
            PGA.dragFnBx = true;
            d3.event.sourceEvent.stopPropagation();
            d3.event.sourceEvent.preventDefault();

            var $svgHelper = $('<svg id="fnBxHelperSvg" style="z-index:900" width="'+fnBxWidth+'" height="'+fnBxheight+'"></svg>').attr('xmlns','http://www.w3.org/2000/svg');
            $svgHelper.html(this.innerHTML)

            $helper = $svgHelper.appendTo($helperParent)

            mousepos = d3.mouse($helperParent[0])

            //console.log(mousepos[0])
            $('#fnBxHelperSvg rect').attr('x',0)
            $('#fnBxHelperSvg rect').attr('y',0)
            $('#fnBxHelperSvg text').attr('dx',fnBxWidth/2)
            $('#fnBxHelperSvg text').attr('dy',fnBxheight/2)

        })
        .on('drag', function (d, i) {
            PGA.dragFnBx = true;
            d.cx += d3.event.dx;
            d.cy += d3.event.dy;
            d3.select(this).attr('cx', d.cx).attr('cy', d.cy)

            mousepos = d3.mouse($helperParent[0])

            // update the helper's position
            $helper.css({
              left: mousepos[0],
              top: mousepos[1]
            });
        })
        .on('dragend', function (d, event) {
            console.log('End Dragging FnBox');
            mousepos = d3.mouse($helperParent[0])
            $helper.remove();
            //if (PGA.mouseOnEditor && PGA.dragFnBx && !jQuery.isEmptyObject(PGA.edgeInfoFnBx)) {
            if (PGA.mouseOnEditor && PGA.dragFnBx && !PGA.dialogOpen) {
                PGA.canCreateNode = true;
                mousepos = d3.mouse(this);
                PGA.fnBxParams = d;
                PolicyGraphs.prototype.contextMenu(this, 'fnbx', d);
                PGA.mouseOnEditor = false;
                PGA.dragFnBx = false;

            }
        });


    // Update the nodes…
    var node = svgDiv.selectAll("g.fnBx")
            .data(fnBxData.function_boxes);

    // Enter the nodes.
    var nodeEnter = node.enter().append("g")
            .attr("class", "fnBx")
            .call(dragFnBx)
            .on('mousedown', function(d) {
                if(d3.event.ctrlKey) return;
                // select node
                mousedown_fnBx_node = d;

                if(mousedown_fnBx_node === selected_fnBx_node) selected_fnBx_node = null;
                else selected_fnBx_node = mousedown_fnBx_node;
                selected_fnBx_link = null;
            })
            .on('mouseup', function(d) {

                if(!mousedown_fnBx_node) return;


                // check for drag-to-self
                mouseup_fnBx_node = d;
                if(mouseup_fnBx_node === mousedown_fnBx_node) { _self.resetMouseVars(); return; }

                // unenlarge target node
                d3.select(this).attr('transform', '');

                // add link to graph (update if exists)
                // NB: links are strictly source < target; arrows separately specified by booleans
                var source, target, direction;
                if(mousedown_fnBx_node.id < mouseup_fnBx_node.id) {
                    source = mousedown_fnBx_node;
                    target = mouseup_fnBx_node;
                    direction = 'right';
                } else {
                    source = mouseup_fnBx_node;
                    target = mousedown_fnBx_node;
                    direction = 'left';
                }
                edgeSource = source;
                edgeTarget = target;
                edgeDirection = direction;
            })
            .attr("transform", function(d) {
                //return "translate(" + parseInt(d.x/2) + "," + parseInt(d.y/2) + ")";
            })

        nodeEnter.append("rect")
                .attr("width", fnBxWidth)
                .attr("height", fnBxheight)
                .attr("x", width/2-fnBxWidth/2)
                .attr("y", function(d,i){
                    return i*2*fnBxheight;
                })
                .style("fill", "lightgrey")
                .style("stroke", "#64646B")
                .style("stroke-width", 1)


        nodeEnter.append("text")
                .style("text-anchor", "middle")
                .attr("dx", width/2)
                .attr("dy", function(d,i){return i*2*fnBxheight;})
                .style("font-size","20px")
                .attr("dy", function(d,i){return i*2*fnBxheight + fnBxheight/2 + 5;})
                .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
                .text(function(d) { return d.name; })

};
/**/
function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("Text", ev.target.id);
}

function drop(ev) {
    var data = ev.dataTransfer.getData("Text");
    ev.target.appendChild(document.getElementById(data));
    ev.preventDefault();
}

function getIndexOf(a, v) {
        var l = a.length;
        for (var k = 0; k < l; k++) {
            if (a[k].id == v) {
                return k;
            }
        }
        return false;
    }


function closeModal() {
    mousedown_dailog = null;
    modalWrapper.className = "";
    document.getElementById("addEPGDailog").style.display = "none";
    document.getElementById("edgeDailog").style.display = "none";
    document.getElementById("editEPGsDailog").style.display = "none";
    document.getElementById("insertFnBxDailog").style.display = "none";

    //clearForm("addEPGDailog");
    //clearForm("edgeDailog");
    PGA.dialogOpen = false;
};

function checkForm(dailog) {
    if (dailog == "editEPGsDailog") {
        var getNodeIndex = getIndexOf(nodes, EPGsParams.id)
        nodes[getNodeIndex].labels[0] = [document.getElementById("editname").value];

        svg.classed('active', true);

        if (mousedown_dailog || selected_link) return;
        //if(d3.event.ctrlKey || mousedown_node || mousedown_link) return;
        d3.select("g#g_" + EPGsParams.id).selectAll("text").text(nodes[getNodeIndex].labels[0]);
        // insert new node at point
        restart();

    }
    /*

    else {
        createNode(x, y, document.getElementById("name").value);

    }
    */
    if (dailog == "labelEditDailog") {

        var index;
        for (var i in PGA.labelTreeJSON.label_tree.nodeData) {
            if(PGA.labelTreeJSON.label_tree.nodeData[i].nodeId == LabelTreeParams.id){
                index = i;
            }
        }

        var getNodeIndex = getIndexOf(nodes, LabelTreeParams.id)

        //console.log(LabelTreeParams.name)
        nodes[getNodeIndex].name[0] = [document.getElementById("labelname").value];

        //console.log(nodes)
        update();

        PGA.labelTreeJSON.label_tree.nodeData[index].name = "xyz";
        closeModal();
    }



    EPGsParams = {};
    EdgeParams = {};
    LabelTreeParams = {};
    FnBxParams = {};

    modalWrapper.className = "";
    document.getElementById("addEPGDailog").style.display = "none";
    document.getElementById("edgeDailog").style.display = "none";
    document.getElementById("editEPGsDailog").style.display = "none";
    //document.getElementById("labelEditDailog").style.display = "none";
}


function labeltreeJSON() {
    //console.log(PGA.labelTreeJSON)
    document.getElementById("label_tree_spec").value = JSON.stringify(PGA.labelTreeJSON);
}

function clearForm(myFormElement) {
    var elements = document.getElementById(myFormElement).elements;

    document.getElementById(myFormElement).reset();

    for (i = 0; i < elements.length; i++) {

        field_type = elements[i].type.toLowerCase();

        switch (field_type) {

            case "text":
            case "password":
            case "textarea":
            case "hidden":

                elements[i].value = "";
                break;

            case "radio":
            case "checkbox":
                if (elements[i].checked) {
                    elements[i].checked = false;
                }
                break;

            case "select-one":
            case "select-multi":
                elements[i].selectedIndex = -1;
                break;

            default:
                break;
        }
    }
}