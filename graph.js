var PolicyGraphs = function(svgDiv,pgData,editable) {
    var thisGraph = this;

    var linkDistance = 250;
    thisGraph.circleR = 50;
    thisGraph.clickableEdgeWidth = 10;
    var fnBoxWidth = 80;
    var fnBoxHeight = 50;
    // set up SVG for D3
    var width = document.getElementById(svgDiv).offsetWidth - 4,
        height = width * .9;

    var EPGsParams = {};
    var EdgeParams = {};


    var doubleEdgeWidth = 2;
    var x, y;

    var edgeTarget;
    thisGraph.context = null;


    var svg = d3.select('#'+svgDiv)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

        svg.on("contextmenu", function() {
          d3.event.preventDefault();
        });



    // set up initial nodes and links
    //  - nodes are known by 'id', not by index in array.
    //  - reflexive edges are indicated on the node (as a bold black circle).
    //  - links are always source < target; edge directions are set by 'left' and 'right'.

    thisGraph.pgNodes = pgData.policy_graph.nodes;


    var lastNodeId = thisGraph.pgNodes.length;

    var links = [];


    var arrwHeadTypes = [];
    var uniqueLinkNum = [];
    var uniqueArrwHeads = ["CAN", "MUST"];


    //(this, str, d, index, thisGraph.pgNodes);
    PolicyGraphs.prototype.contextMenu = function(that,newContext,fndata) {
        console.log(that+"/"+newContext+"/"+fndata)

        if(!editable){
            return;
        }

        if (thisGraph.context) {
            if (thisGraph.context !== newContext) {
                console.log('current context: ' + thisGraph.context);
                return;
            }
        }
        thisGraph.context = newContext;


        if(!fndata){
            d3.event.preventDefault();
        }


        d3.select('#context-menu')
              .style('position', 'absolute')
              .style('left', ($(that).offset().left-200) + "px")
              .style('top', ($(that).offset().top-100) + "px")
              .style('display', 'inline-block')
              .on('mouseleave', function() {
                //d3.select('#context-menu').style('display', 'none');
                //context = null;
              });
        d3.select('#context-menu').attr('class', 'menu ' + thisGraph.context);

        PGA.fnBxParams = fndata;



        if (thisGraph.context == "epg") {
            console.log(fndata);
            $("#epgname").html(fndata.endpoint_group.labels);
            $("#epg_description").html(fndata.description);

        }

        if (thisGraph.context == "fnbx") {
            mousedown_dailog = 1;
            $("#fnBxName").html(fndata.name);

            if(fndata.function_box){
                $("#fnBxHeader").html('Update');
                fndata = fndata.function_box;
            }else{
                $("#fnBxHeader").html('Add');
            }

            $("#fnBxParameters").html('');

            $.each(fndata.parameters, function (key, value) {
                fnBxInputsOutput('fnBxParameters', key, value);
            });

        }

        if (thisGraph.context == "edge") {
            mousedown_dailog = 1;

            if (params) {
                //$('#classifiers tr:not(:first)').remove();
                $('#edgeType').val(params.type);
                $.each(params.classifiers, function (key, value) {

                    if (value.protocol == undefined) {
                        value.protocol = "tcp";
                    }
                    addRowToTable(value.protocol, value.dstport);
                });

            }
        }


        /*
        if (thisGraph.context == "editEdge") {
            document.getElementById("epgname").value = EPGsParams.labels[0];

        }*/

        if (thisGraph.context == "labelEditDailog") {
            mousedown_dailog = 1;

            if (params) {
                document.getElementById("labelname").value = params.name;


            }
        }

        if (thisGraph.context == "insertFnBxDailog") {
            mousedown_dailog = 1;
            document.getElementById("fnBxName").innerHTML = params.description;
            $("#fnBxInputs").html('');
            $("#fnBxOutputs").html('');
            $.each(params.parameters, function (key, value) {
                fnBxInputsOutput('fnBxInputs',value.name, value.value);
            });
            $.each(params.output, function (key, value) {
                fnBxInputsOutput('fnBxOutputs',value.name, value.value);
            });

        }



    };


    PolicyGraphs.prototype.closeContextMenu = function(){
        d3.select('#context-menu').style('display', 'none');
        thisGraph.context = null;
    };

    PolicyGraphs.prototype.setCircleR = function(circleR){
        thisGraph.circleR = circleR;
    };

    function reLinks(id, value, classifiers, edgeLabel, type, direction) {
        this.source = id;
        this.target = value;
        this.edgeLabel = edgeLabel;
        this.classifiers = classifiers;
        this.direction = direction;
        this.type = type;
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

    //alert (getIndexOf(thisGraph.pgNodes,'2'));

    for (var key in pgData.policy_graph.edges) {
        var attrName = key;
        var attrValue = pgData.policy_graph.edges[key];

        var edgeLabel = "";
        var portLabel = "";
        var classifiersJson = [];

        for (var proto in attrValue.classifiers) {

            var pl = attrValue.classifiers[proto];

            edgeLabel += "{";
            if (pl.protocol == undefined) {
                edgeLabel += "tcp";
            } else {
                edgeLabel += pl.protocol;
            }

            if (pl.dstport == undefined) {
                edgeLabel += "";
            } else {
                edgeLabel += ",";
                edgeLabel += pl.dstport;
            }

            edgeLabel += "}";


            classifiersJson.push({protocol: pl.protocol, dstport: pl.dstport});

        }

        //console.log(">>"+edgeLabel);

        links[key] = new reLinks(parseInt(getIndexOf(thisGraph.pgNodes, attrValue.source)), parseInt(getIndexOf(thisGraph.pgNodes, attrValue.target)), classifiersJson, edgeLabel, attrValue.type,attrValue.direction);


    }

    function counter(array_elements, current) {
        array_elements.sort();
        var cnt = 0;
        for (var i = 0; i < array_elements.length; i++) {
            if (array_elements[i] == current) {
                cnt++;
            }
        }
        return cnt;
    }


    //console.log(links)
    //any links with duplicate source and target get an incremented 'linknum'
    for (var i = 0; i < links.length; i++) {
        //console.log(links[i])
        var str = (links[i].source + "" + links[i].target).toString();
        uniqueLinkNum.push(str);
        arrwHeadTypes.push({type: links[i].type, linknum: counter(uniqueLinkNum, str)})
        links[i].linknum = counter(uniqueLinkNum, str);

    }
    ;

    // get unique arrow head types
    var uniqueArrws = uniqueTest(arrwHeadTypes);

    function uniqueTest(arr) {
        var n, y, x, i, r;
        r = [];
        o: for (i = 0, n = arr.length; i < n; i++) {

            for (x = 0, y = r.length; x < y; x++) {

                if (r[x].type == arr[i].type && r[x].linknum == arr[i].linknum) {
                    continue o;
                }
            }
            r.push(arr[i]);
        }
        return r;
    };

    for (var i = 0; i < uniqueArrws.length; i++) {
        uniqueArrwHeads.push(uniqueArrws[i].type + "" + uniqueArrws[i].linknum)
    }
    ;
    //console.log(links)
    /////////////////////////////////////////////////////////

    // init D3 force layout
    var force = d3.layout.force()
        .nodes(thisGraph.pgNodes)
        .links(links)
        .size([width, height])
        //    .linkDistance(linkDistance)
        .linkDistance(function (d) {
            if (typeof d.fnBox != 'undefined' && d.fnBox.length > 0) {
                return linkDistance + d.fnBox.length * fnBoxWidth;
            } else {
                return linkDistance
            }
        })
        .charge(-2000)
        .on('tick', tick)

    // define arrow markers for graph links
    svg.append('svg:defs').append('svg:marker')
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr("refX", parseInt(thisGraph.circleR))
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#000');

    svg.append('svg:defs').append('svg:marker')
        .attr('id', 'start-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 4)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M10,-5L0,0L10,5')
        .attr('fill', '#000');


    // define arrow markers for graph links
    var marker = svg.append("svg:defs").selectAll("marker")
        .data(uniqueArrwHeads)
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", parseInt(thisGraph.circleR))
        .style("fill", function (d) {
            if (d == "BLOCK" || d == "BLOCK1" || d == "BLOCK2") {
                return "red";
            }
        })
        .attr("refY", 0)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")

    var markerPath = svg.selectAll("marker")

        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");


    // line displayed when dragging new nodes
    var drag_line = svg.append('svg:path')
        .attr('class', 'edge dragline hidden')
        .attr('d', 'M0,0L0,0');

    // handles to link and node element groups
    var clickableEdge = svg.append('svg:g').selectAll('path'),
        path = svg.append('svg:g').selectAll('path'),
        circle = svg.append('svg:g').selectAll('g'),
        edgeLabels = svg.selectAll("text")

    // mouse event vars
    var selected_node = null,
        selected_link = null,
        mousedown_link = null,
        mousedown_node = null,
        mouseup_node = null,
        mousedown_dailog = null,
        edgeSource = null,
        edgetarget = null,
        edgeDirection = null,
        fnBx_edges = null,
        fnBx_node = null

        ;

    function resetMouseVars() {
        mousedown_node = null;
        mouseup_node = null;
        mousedown_link = null;
        mousedown_dailog = null,
        fnBx_edges = null,
        fnBx_node = null
        ;
    }

    function calcAngle(x1, x2, y1, y2) {
        var calcAngleVal = Math.atan2(x1 - x2, y1 - y2) * (180 / Math.PI);

        if (calcAngleVal < 0) {
            calcAngleVal = Math.abs(calcAngleVal);
        } else {
            calcAngleVal = 360 - calcAngleVal;
        }

        return calcAngleVal;
    }

    function distance(lat1, lon1, lat2, lon2) {
        var radlat1 = Math.PI * lat1 / 180;
        var radlat2 = Math.PI * lat2 / 180;
        var radlon1 = Math.PI * lon1 / 180;
        var radlon2 = Math.PI * lon2 / 180;
        var theta = lon1 - lon2
        var radtheta = Math.PI * theta / 180;
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        //dist = dist * 60 * 1.1515
        //if (unit=="K") { dist = dist * 1.609344 }
        //if (unit=="N") { dist = dist * 0.8684 }
        return dist
    }


    function drawDoubleEdge(px, py, cx, cy, point, thick) {
        var radius = thick;
        var dx, dy, dd, a, b, t, ta, tb;
        // find tangents
        dx = cx - px;
        dy = cy - py;


        dd = Math.sqrt(dx * dx + dy * dy);
        a = Math.asin(radius / dd);
        b = Math.atan2(dy, dx);

        t = b - a;
        ta = {x: radius * Math.sin(t), y: radius * -Math.cos(t)};

        t = b + a;
        tb = {x: radius * -Math.sin(t), y: radius * Math.cos(t)};

        if (point == "ax") {
            return cx + ta.x;
        }
        if (point == "ay") {
            return cy + ta.y;
        }

        if (point == "bx") {
            return cx + tb.x;
        }
        if (point == "by") {
            return cy + tb.y;
        }
    }

    function drawCurvedEdge(Ax, Ay, Bx, By,linknum) {
        var M = (linknum - 1) * 120;
        var xy = getKxKy(Ax,Ay,Bx,By,M);
        return "M" + Ax + "," + Ay +
            " Q" + xy[0] + "," + xy[1] +
            " " + Bx + "," + By
    }

    function edgeCenterPt(Ax,Ay,Bx,By,linknum) {
            var M = (linknum - 1) * 60;
            var xy = getKxKy(Ax,Ay,Bx,By,M);
            return [xy[0], xy[1]-2];
    }
    function getKxKy(Ax,Ay,Bx,By,M) {
            var Jx = Ax + (Bx - Ax) / 2;
            var Jy = Ay + (By - Ay) / 2;

            // We need a and b to find theta, and we need to know the sign of each to make sure that the orientation is correct.
            var a = Bx - Ax;
            var asign = (a < 0 ? -1 : 1);
            var b = By - Ay;
            var bsign = (b < 0 ? -1 : 1);
            var theta = Math.atan(b / a);

            // Find the point that's perpendicular to J on side
            var costheta = asign * Math.cos(theta);
            var sintheta = asign * Math.sin(theta);

            // Find c and d
            var c = M * sintheta;
            var d = M * costheta;

            // Use c and d to find Kx and Ky
            var Kx = Jx - c;
            var Ky = Jy + d;

            return [Kx, Ky];
    }

    // update force layout (called automatically each iteration)
    function tick() {

        circle.attr('transform', function (d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });

        if(editable){
            //clcikable for edge
            clickableEdge.attr("d", function (d) {
                var dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                //dr = 75/d.linknum;  //linknum is defined above
                    dr = (d.linknum - 1) * 180;

                if (d.target == d.source) {
                    //M700,150 a25,100 -30 0,1 50,-25   elliptical arc path
                    //return "M"+(d.target.x-thisGraph.circleR/2)+","+d.target.y+" a25,100 0 0,1 50,0";
                } else {

                    if (d.linknum == 1) {
                        sx = d.source.x;
                        sy = d.source.y;

                        tx = d.target.x;
                        ty = d.target.y;

                        p1x = drawDoubleEdge(tx, ty, sx, sy, "ax", thisGraph.clickableEdgeWidth);
                        p1y = drawDoubleEdge(tx, ty, sx, sy, "ay", thisGraph.clickableEdgeWidth);

                        p2x = drawDoubleEdge(sx, sy, tx, ty, "ax", thisGraph.clickableEdgeWidth);
                        p2y = drawDoubleEdge(sx, sy, tx, ty, "ay", thisGraph.clickableEdgeWidth);

                        p3x = drawDoubleEdge(sx, sy, tx, ty, "bx", thisGraph.clickableEdgeWidth);
                        p3y = drawDoubleEdge(sx, sy, tx, ty, "by", thisGraph.clickableEdgeWidth);


                        p4x = drawDoubleEdge(tx, ty, sx, sy, "bx", thisGraph.clickableEdgeWidth);
                        p4y = drawDoubleEdge(tx, ty, sx, sy, "by", thisGraph.clickableEdgeWidth);

                        return "M" + (p2x) + " " + (p2y) + " L" + (p4x) + " " + (p4y) + " L" + (p1x) + " " + (p1y) + " L" + (p3x) + " " + (p3y) + "";


                    } else {

                        sx = d.source.x;
                        sy = d.source.y;

                        tx = d.target.x;
                        ty = d.target.y;

                        p1x = drawDoubleEdge(tx, ty, sx, sy, "ax", thisGraph.clickableEdgeWidth);
                        p1y = drawDoubleEdge(tx, ty, sx, sy, "ay", thisGraph.clickableEdgeWidth);

                        p2x = drawDoubleEdge(sx, sy, tx, ty, "ax", thisGraph.clickableEdgeWidth);
                        p2y = drawDoubleEdge(sx, sy, tx, ty, "ay", thisGraph.clickableEdgeWidth);

                        p3x = drawDoubleEdge(sx, sy, tx, ty, "bx", thisGraph.clickableEdgeWidth);
                        p3y = drawDoubleEdge(sx, sy, tx, ty, "by", thisGraph.clickableEdgeWidth);


                        p4x = drawDoubleEdge(tx, ty, sx, sy, "bx", thisGraph.clickableEdgeWidth);
                        p4y = drawDoubleEdge(tx, ty, sx, sy, "by", thisGraph.clickableEdgeWidth);

                        return "" + drawCurvedEdge(p2x, p2y, p4x, p4y, d.linknum) + " L" + (p1x) + " " + (p1y) + drawCurvedEdge(p1x, p1y, p3x, p3y, -d.linknum) + " L" + (p2x) + " " + (p2y) + "";


                    }

                }

            })

        }



        // draw directed edges with proper padding from node centers

        path.attr("d", function (d) {


            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
            //dr = 75/d.linknum;  //linknum is defined above
                dr = (d.linknum - 1) * 180;

            if (d.target == d.source) {
                //M700,150 a25,100 -30 0,1 50,-25   elliptical arc path
                return "M" + (d.target.x - thisGraph.circleR / 2) + "," + d.target.y + " a25,100 0 0,1 50,0";
            } else if (d.type == "MUST") {

                if (d.linknum == 1) {
                    sx = d.source.x;
                    sy = d.source.y;

                    tx = d.target.x;
                    ty = d.target.y;

                    p1x = drawDoubleEdge(tx, ty, sx, sy, "ax", 2);
                    p1y = drawDoubleEdge(tx, ty, sx, sy, "ay", 2);

                    p2x = drawDoubleEdge(sx, sy, tx, ty, "ax", 2);
                    p2y = drawDoubleEdge(sx, sy, tx, ty, "ay", 2);

                    p3x = drawDoubleEdge(sx, sy, tx, ty, "bx", 2);
                    p3y = drawDoubleEdge(sx, sy, tx, ty, "by", 2);


                    p4x = drawDoubleEdge(tx, ty, sx, sy, "bx", 2);
                    p4y = drawDoubleEdge(tx, ty, sx, sy, "by", 2);

                    return "M" + (p2x) + " " + (p2y) + " L" + (p4x) + " " + (p4y) + " L" + (p1x) + " " + (p1y) + " L" + (p3x) + " " + (p3y) + "";


                } else {

                    sx = d.source.x;
                    sy = d.source.y;

                    tx = d.target.x;
                    ty = d.target.y;

                    p1x = drawDoubleEdge(tx, ty, sx, sy, "ax", 2);
                    p1y = drawDoubleEdge(tx, ty, sx, sy, "ay", 2);

                    p2x = drawDoubleEdge(sx, sy, tx, ty, "ax", 2);
                    p2y = drawDoubleEdge(sx, sy, tx, ty, "ay", 2);

                    p3x = drawDoubleEdge(sx, sy, tx, ty, "bx", 2);
                    p3y = drawDoubleEdge(sx, sy, tx, ty, "by", 2);


                    p4x = drawDoubleEdge(tx, ty, sx, sy, "bx", 2);
                    p4y = drawDoubleEdge(tx, ty, sx, sy, "by", 2);

                    return "" + drawCurvedEdge(p2x, p2y, p4x, p4y, d.linknum) + " L" + (p1x) + " " + (p1y) + drawCurvedEdge(p3x, p3y, p1x, p1y, d.linknum) + "";


                }

            } else {
                return drawCurvedEdge(d.source.x, d.source.y, d.target.x, d.target.y, d.linknum);
            }

        })



        ////////////
        edgeLabels.attr("x", function (d) {
                if (d.target == d.source) {
                    return d.source.x;
                } else {
                    var centerX = edgeCenterPt(d.source.x, d.source.y, d.target.x, d.target.y,d.linknum);
                    return centerX[0];
                }
            })
        edgeLabels.attr("y", function (d) {
                if (d.target == d.source) {
                    return d.source.y - 100;
                } else {
                    var centerY = edgeCenterPt(d.source.x, d.source.y, d.target.x, d.target.y,d.linknum);
                    return centerY[1];
                }

            })

        marker.attr("refY", function (d) {
            if (d == "MUST1") {
                return doubleEdgeWidth;
            } else if (d == "MUST2") {
                return doubleEdgeWidth;
            } else if (d == "CAN") {
                return -3.5;
            } else if (d == "CAN1") {
                return 0;
            } else if (d == "CAN2") {
                return 3;
            } else if (d == "CAN3") {
                return 1;
            } else if (d == "CAN4") {
                return 0;

            } else if (d == "BLOCK") {
                return -3.5;
            } else if (d == "BLOCK1") {
                return 0;
            } else if (d == "BLOCK2") {
                return 3;
            } else if (d == "BLOCK3") {
                return 1;
            } else if (d == "BLOCK4") {
                return 0;


            } else {
                return 0;
            }


        })

    }

    // update graph (called when needed)
    PolicyGraphs.prototype.restart = function(){

        // circle (node) group
        // NB: the function arg is crucial here! nodes are known by id, not by index!
        circle = circle.data(thisGraph.pgNodes, function (d) {
            return d.id;
        });
        // update existing nodes (reflexive & selected visual states)
        circle.enter().append('svg:g')
            .attr("id", function (d) {
                return "g_" + d.id;
            })

            .attr("class", function (d) {
                if (d.function_box) {
                   return "rect";
                } else {
                   return "circle";
                }
            })
            .append("circle")
                .attr("class", "node")
                .attr("style", function (d) {
                    if (d.endpoint_group) {
                       return "display:block";
                    } else {
                       return "display:none";
                    }

                })
                .attr("r", function (d) {
                    return thisGraph.circleR
                })
                .on("contextmenu", function(d, index) {
                    console.log("circle context")
                  thisGraph.contextMenu(this, 'epg', d, index, thisGraph.pgNodes);
                  d3.event.preventDefault();
                })
                .on('mouseover', function (d) {
                if (!mousedown_node || d === mousedown_node) return;
                // enlarge target node
                d3.select(this).attr('transform', 'scale(1.1)');
            })
            .on('mouseout', function (d) {
                if (!mousedown_node || d === mousedown_node) return;
                // unenlarge target node
                d3.select(this).attr('transform', '');
            })
            .on('mousedown', function (d) {
                if (d3.event.ctrlKey) return;

                // select node
                mousedown_node = d;
                if (mousedown_node === selected_node) selected_node = null;
                else selected_node = mousedown_node;
                selected_link = null;

                if(editable){
                    // reposition drag line
                    drag_line
                        .style('marker-end', 'url(#end-arrow)')
                        .classed('hidden', false)
                        .attr('d', function (d) {
                            if (d) {
                                return 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y
                            } else {
                                return 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y
                            }

                        });


                    //return "M"+(d.target.x-thisGraph.circleR/2)+","+d.target.y+" a25,100 0 0,1 50,0";
                    //.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

                    thisGraph.restart();

                }

            })
            .on('mouseup', function (d) {
                if (!mousedown_node) return;

                if(editable){
                    // needed by FF
                    drag_line
                        .classed('hidden', true)
                        .style('marker-end', '');

                }

                // check for drag-to-self
                mouseup_node = d;
                /*
                 if(mouseup_node === mousedown_node) {
                 resetMouseVars(); return;
                 }
                 */
                // unenlarge target node
                d3.select(this).attr('transform', '');

                // add link to graph (update if exists)
                // NB: links are strictly source < target; arrows separately specified by booleans
                var source, target, direction;
                if (mousedown_node.id < mouseup_node.id) {
                    source = mousedown_node;
                    target = mouseup_node;
                    direction = 'right';
                } else {
                    source = mouseup_node;
                    target = mousedown_node;
                    direction = 'left';
                }


                edgeSource = source;
                edgeTarget = target;
                edgeDirection = direction;
                //PolicyGraphs.prototype.contextMenu(this, 'edge', d, '', PolicyGraphs.prototype.pgNodes);

            })


            circle.append("rect")
                .attr("width", fnBoxWidth)
                .attr("height", fnBoxHeight)
                .attr("x", -fnBoxWidth/2)
                .attr("y", -fnBoxHeight/2)
                .attr("class", "node")
                .attr("style", function (d) {
                    if (d.function_box) {
                       return "display:block";
                    } else {
                       return "display:none";
                    }
                })
                .classed('reflexive', function (d) {
                    return d.reflexive;
                })
                .on("contextmenu", function(d, index) {
                    console.log("rect context")
                  thisGraph.contextMenu(this, 'fnbx', d, index, thisGraph.pgNodes);
                  d3.event.preventDefault();
                })
                .on('mouseover', function (d) {
                if (!mousedown_node || d === mousedown_node) return;
                // enlarge target node
                d3.select(this).attr('transform', 'scale(1.1)');
            })
            .on('mouseout', function (d) {
                if (!mousedown_node || d === mousedown_node) return;
                // unenlarge target node
                d3.select(this).attr('transform', '');
            })
            .on('mousedown', function (d) {
                if (d3.event.ctrlKey) return;

                // select node
                mousedown_node = d;
                if (mousedown_node === selected_node) selected_node = null;
                else selected_node = mousedown_node;
                selected_link = null;

                if(editable){
                    // reposition drag line
                    drag_line
                        .style('marker-end', 'url(#end-arrow)')
                        .classed('hidden', false)
                        .attr('d', function (d) {
                            if (d) {
                                return 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y
                            } else {
                                return 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y
                            }

                        });


                    //return "M"+(d.target.x-thisGraph.circleR/2)+","+d.target.y+" a25,100 0 0,1 50,0";
                    //.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

                    thisGraph.restart();

                }

            })
            .on('mouseup', function (d) {
                if (!mousedown_node) return;

                if(editable){
                    // needed by FF
                    drag_line
                        .classed('hidden', true)
                        .style('marker-end', '');

                }

                // check for drag-to-self
                mouseup_node = d;
                /*
                 if(mouseup_node === mousedown_node) {
                 resetMouseVars(); return;
                 }
                 */
                // unenlarge target node
                d3.select(this).attr('transform', '');

                // add link to graph (update if exists)
                // NB: links are strictly source < target; arrows separately specified by booleans
                var source, target, direction;
                if (mousedown_node.id < mouseup_node.id) {
                    source = mousedown_node;
                    target = mouseup_node;
                    direction = 'right';
                } else {
                    source = mouseup_node;
                    target = mousedown_node;
                    direction = 'left';
                }


                edgeSource = source;
                edgeTarget = target;
                edgeDirection = direction;
                //PolicyGraphs.prototype.contextMenu(this, 'edge', d, '', PolicyGraphs.prototype.pgNodes);

            })
        
            circle.append('svg:text')
            .text(function (d) {
                if(d.endpoint_group){
                    return d.endpoint_group.labels;
                }
                if(d.function_box){
                    return d.function_box.name;
                }
            })
            .attr('class', 'labels')
            .style("text-anchor", "middle");
            
        // remove old nodes
        circle.exit().remove();
        
        


        clickableEdge = clickableEdge.data(links);

        // add new lin
        clickableEdge.enter().append('svg:path')
            .attr('class', 'clickableEdge')
            .style('fill', 'transparent')
            .each(function () {
                var sel = d3.select(this);
                var state = false;

                sel.on('click', function (d) {
                    d3.select(this).style('fill', '#e5e5e5')
                });


                sel.on('dblclick', function (d) {
                    state = !state;
                    if (state) {

                        var point = d3.mouse(this);
                        x = point[0];
                        y = point[1];

                        EdgeParams = {
                            source: d.source,
                            traget: d.target,
                            classifiers: d.classifiers,
                            edgelabel: d.edgelabel,
                            type: d.type
                        };

                        //openModal('edgeDailog', x, y, EdgeParams);


                    } else {
                        sel.style('fill', '#fff');
                    }
                });
            })

            .on('mouseout', function (d) {
                d3.select(this).style('fill', 'transparent')
                PGA.edgeInfoFnBx = {};

            })

            .on('mouseover', function (d) {
                d3.select(this).style('fill', '#e5e5e5')
                if(PGA.dragFnBx){
                    PGA.edgeInfoFnBx = {
                        source: d.source,
                        traget: d.target,
                        classifiers: d.classifiers,
                        edgelabel: d.edgelabel,
                        type: d.type
                    };

                    // select link
                    fnBx_edges = d;
                }else{
                    fnBx_edges = null;
                }
            })

            .on('mousedown', function (d) {
                //console.log("mousedown on edge")
                if (d3.event.ctrlKey) return;

                // select link
                mousedown_link = d;
                if (mousedown_link === selected_link) selected_link = null;
                else selected_link = mousedown_link;
                selected_node = null;
                thisGraph.restart();
            })
            .on("contextmenu", function(d, index) {
                console.log("clickableEdge context")
                  thisGraph.contextMenu(this, 'edge', d, index, thisGraph.pgNodes);
                  d3.event.preventDefault();
                });




        // remove old links
        clickableEdge.exit().remove();


        // path (link) group
        path = path.data(links);
            // update existing links
            path.classed('selected', function (d) {
                return d === selected_link;
            })
            .style('marker-start', function (d) {
                return d.left ? 'url(#start-arrow)' : '';
            })
            .style('marker-end', function (d) {
                return d.right ? 'url(#end-arrow)' : '';
            });


        // add new links
        path.enter().append('svg:path')
            .attr('class', function (d) {
                if (d.type == "BLOCK") {
                    //block edge red color
                    return d.type.toLowerCase() + 'edge';

                } else if (d.type == "CONDITIONAL") {
                    //block edge dotted
                    return d.type.toLowerCase() + 'edge';

                } else {
                    return 'edge';
                }
            })
            .classed('selected', function (d) {
                return d === selected_link;
            })
            //.style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
            //.style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
            .attr("marker-end", function (d) {
                if (d.source == d.target) {
                    return "url(#" + d.type + ")";
                } else {
                    return "url(#" + d.type + "" + d.linknum + ")";
                }
            })
            .each(function () {
                if(!editable){
                    return;
                }
                var sel = d3.select(this);
                var state = false;

                sel.on('dblclick', function (d) {

                    state = !state;
                    if (state) {

                        var point = d3.mouse(this);
                        x = point[0];
                        y = point[1];

                        EdgeParams = {
                            source: d.source,
                            traget: d.target,
                            classifiers: d.classifiers,
                            edgelabel: d.edgelabel,
                            type: d.type
                        };

                        //openModal('edgeDailog', x, y, EdgeParams);


                    } else {
                        sel.style('fill', '#fff');
                    }
                });
            })

            .on('mouseout', function (d) {

            })

            .on('mouseover', function (d) {

            })

            .on('mousedown', function (d) {
                //console.log("mousedown on edge")
                if (d3.event.ctrlKey) return;

                // select link
                mousedown_link = d;
                if (mousedown_link === selected_link) selected_link = null;
                else selected_link = mousedown_link;
                selected_node = null;
                thisGraph.restart();
            })
            .on("contextmenu", function(d, index) {
                console.log("path context")
                    if(!editable){
                        return;
                    }
                  thisGraph.contextMenu(this, 'edge', d, index, thisGraph.pgNodes);
                  d3.event.preventDefault();
                });



        // remove old links
        path.exit().remove();


        /////////////////////////////////////////////////////////////////////////////////
        edgeLabels = edgeLabels.data(links);
        // update existing labels
        edgeLabels
            .attr("class", "edgeLabel")
            .attr("x", function (d) {
                return d.source.x + (d.target.x - d.source.x) / 4;
            })
            .attr("y", function (d) {
                return d.source.y + (d.target.y - d.source.y) / 4;
            });

        // add new edgeLabels
        edgeLabels.enter().append('svg:text')
            .attr("class", "edgeLabel")
            .attr("x", function (d) {
                return d.source.x + (d.target.x - d.source.x) / 4;
            })
            .attr("y", function (d) {
                return d.source.y + (d.target.y - d.source.y) / 4;
            })

            .text(function (d) {

                return d.edgeLabel;
            })
            .on("click", function (d) {
                //console.log("text click event")
            });

        // remove old labels
        edgeLabels.exit().remove();



        // set the graph in motion
        force.start();

    }

    PolicyGraphs.prototype.createNode = function(x, y, labels) {
        if(!editable){
            return;
        }

        // prevent I-bar on drag
        //d3.event.preventDefault();

        // because :active only works in WebKit?
        svg.classed('active', true);

        //console.log(mousedown_dailog+"<>"+selected_link)
        if (mousedown_dailog || selected_link) return;
        //if(d3.event.ctrlKey || mousedown_node || mousedown_link) return;

        // insert new node at point
        var node = {id: ++lastNodeId, endpoint_group: {labels: [labels], description: 'None'}};
        node.x = x;
        node.y = y;
        thisGraph.pgNodes.push(node);
        //console.log(nodes)
        PGA.mouseOnEditor = false;
        PGA.draglabel = false;

        thisGraph.restart();

    }

    PolicyGraphs.prototype.updateNode = function(desc) {
        thisGraph.pgNodes[thisGraph.pgNodes.indexOf(selected_node)].description = desc;
        thisGraph.closeContextMenu();

    }


    PolicyGraphs.prototype.addLabelsForEdge = function(type) {
        if(!editable){
            return;
        }
        var edgeLabel = "";
        for (var k = 0; k < PGA.tempClassifiers.length; k++) {
            var protocol = PGA.tempClassifiers[k].protocol;
            var dstport = PGA.tempClassifiers[k].dstport;
            edgeLabel += "{";

            edgeLabel += PGA.tempClassifiers[k].protocol;

            edgeLabel += ",";
            edgeLabel += PGA.tempClassifiers[k].dstport;

            edgeLabel += "}";
        }

        link = {
            source: edgeSource,
            target: edgeTarget,
            left: false,
            right: false,
            edgeLabel: edgeLabel,
            classifiers: PGA.tempClassifiers,
            type: type
        };

        link[edgeDirection] = true;
        links.push(link);

        //any links with duplicate source and target get an incremented 'linknum'
        for (var i = 0; i < links.length; i++) {
            if (i != 0 &&
                links[i].source == links[i - 1].source &&
                links[i].target == links[i - 1].target) {
                links[i].linknum = links[i - 1].linknum + 1;

            }
            else {
                links[i].linknum = 1;
            }
            ;
        }
        ;

        selected_link = link;
        selected_node = null;
        PGA.tempClassifiers = [];
        thisGraph.restart();
        //checkForm();
        thisGraph.closeContextMenu();
    }


    PolicyGraphs.prototype.insertFnBx = function() {
        if(!editable){
            return;
        }
        //console.log(PGA.fnBxParams)

        //inert new
        // prevent I-bar on drag
        //d3.event.preventDefault();

        // because :active only works in WebKit?
        svg.classed('active', true);

        //console.log(mousedown_dailog+"<>"+selected_link)

        if(thisGraph.context==null){
            if (mousedown_dailog || selected_link) return;
        }

        //if(d3.event.ctrlKey || mousedown_node || mousedown_link) return;

        // insert new node at point
        var node = {id: ++lastNodeId, function_box: {name:PGA.fnBxParams.name, description:null, parameters:{},logic:null}, description:null};


        var ary = {};

        function pushToAry(name, val) {
           ary[name] = val;
        }

        
        $.each(PGA.fnBxParams.parameters, function (key, item) {
            console.log(PGA.fnBxParams.parameters)
            if($("#fn_"+item).val()!=""){
                pushToAry(item, $("#fn_"+item.value).val());
            }

        });
        node.function_box.parameters = ary;
        node.x = x;
        node.y = y;
        thisGraph.pgNodes.push(node);
        fnBx_node = thisGraph.pgNodes[(lastNodeId-1)]

        console.log(thisGraph.pgNodes)
        PGA.mouseOnEditor = false;
        PGA.draglabel = false;

        thisGraph.restart();
        PGA.fnBxParams={};
        resetMouseVars();
        thisGraph.closeContextMenu();
    }

    PolicyGraphs.prototype.insertEdges = function() {

        links.splice(links.indexOf(fnBx_edges), 1);

        var edgeLabel = "";
        for (var k = 0; k < PGA.tempClassifiers.length; k++) {
            var protocol = PGA.tempClassifiers[k].protocol;
            var dstport = PGA.tempClassifiers[k].dstport;
            edgeLabel += "{";

            edgeLabel += PGA.tempClassifiers[k].protocol;

            edgeLabel += ",";
            edgeLabel += PGA.tempClassifiers[k].dstport;

            edgeLabel += "}";
        }

        link = {
            source: fnBx_edges.source,
            target: fnBx_node,
            left: false,
            right: false,
            edgeLabel: edgeLabel,
            classifiers: PGA.tempClassifiers,
            type: type
        };

        link2 = {
            source: fnBx_node,
            target: fnBx_edges.target,
            left: false,
            right: false,
            edgeLabel: edgeLabel,
            classifiers: PGA.tempClassifiers,
            type: type
        };

        link[edgeDirection] = true;
        link2[edgeDirection] = true;
        links.push(link);
        links.push(link2);

        //any links with duplicate source and target get an incremented 'linknum'
        for (var i = 0; i < links.length; i++) {
            if (i != 0 &&
                links[i].source == links[i - 1].source &&
                links[i].target == links[i - 1].target) {
                links[i].linknum = links[i - 1].linknum + 1;

            }
            else {
                links[i].linknum = 1;
            }
            ;
        };

        thisGraph.restart();
        thisGraph.closeContextMenu();

    }



    function updateEdge(port, protocol, type) {
        var getEDgeIndex = getIndexOf(links, EdgeParams.id)
        links[getEDgeIndex].labels[0] = [document.getElementById("epgname").value];

        svg.classed('active', true);

        //console.log(mousedown_dailog+"<>"+selected_link)
        if (mousedown_dailog || selected_link) return;
        //if(d3.event.ctrlKey || mousedown_node || mousedown_link) return;
        d3.select("g#g_" + EdgeParams.id).selectAll("text").text(thisGraph.pgNodes[getNodeIndex].labels[0]);
        // insert new node at point
        thisGraph.restart();
    }




    function spliceLinksForNode(node) {
        var toSplice = links.filter(function (l) {
            return (l.source === node || l.target === node);
        });
        toSplice.map(function (l) {
            links.splice(links.indexOf(l), 1);
        });
    }


    function mousedown() {
        if (!mousedown_node && !mousedown_link && !selected_link) {
            var point = d3.mouse(this);
            x = point[0];
            y = point[1];


        }
    }


    function mousemove() {
        if (!mousedown_node) return;

        // update drag line
        //drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
        if(editable){
            drag_line.attr('d', function () {
                var dx = mousedown_node.x - d3.mouse(this)[0];
                var dy = mousedown_node.y - d3.mouse(this)[1];
                var dd = Math.sqrt(dx * dx + dy * dy);
                if (dd < linkDistance / 2) {
                    return "M" + (mousedown_node.x - thisGraph.circleR / 2) + "," + mousedown_node.y + " a25," + dd + " 0 0,1 50,0";
                } else {
                    return 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]
                }
            });


            thisGraph.restart();

        }

    }

    function mouseup() {

        if (mousedown_node && editable) {
            // hide drag line
            drag_line
                .classed('hidden', true)
                .style('marker-end', '');

        }

        // because :active only works in WebKit?
        svg.classed('active', false);


        // clear mouse event vars
        resetMouseVars();

    }



    // only respond once per keydown
    var lastKeyDown = -1;

    function keydown() {
        //d3.event.preventDefault();

        if (lastKeyDown !== -1) return;
        lastKeyDown = d3.event.keyCode;

        // ctrl
        if (d3.event.keyCode === 17) {
            circle.call(force.drag);
            svg.classed('ctrl', true);
        }

        if (!selected_node && !selected_link) return;
        switch (d3.event.keyCode) {
            case 8: // backspace
            case 46: // delete
                if (selected_node) {
                    thisGraph.pgNodes.splice(thisGraph.pgNodes.indexOf(selected_node), 1);
                    spliceLinksForNode(selected_node);
                } else if (selected_link) {
                    links.splice(links.indexOf(selected_link), 1);
                }
                selected_link = null;
                selected_node = null;
                thisGraph.restart();
                break;
            case 66: // B
                if (selected_link) {
                    // set link direction to both left and right
                    selected_link.left = true;
                    selected_link.right = true;
                }
                thisGraph.restart();
                break;
            case 76: // L
                if (selected_link) {
                    // set link direction to left only
                    selected_link.left = true;
                    selected_link.right = false;
                }
                thisGraph.restart();
                break;
            case 82: // R
                if (selected_node) {
                    // toggle node reflexivity
                    selected_node.reflexive = !selected_node.reflexive;
                } else if (selected_link) {
                    // set link direction to right only
                    selected_link.left = false;
                    selected_link.right = true;
                }
                thisGraph.restart();
                break;
        }
    }

    function keyup() {
        lastKeyDown = -1;

        // ctrl
        if (d3.event.keyCode === 17) {
            circle
                .on('mousedown.drag', null)
                .on('touchstart.drag', null);
            svg.classed('ctrl', false);
        }
    }

    // app starts here
    svg.on('mousedown', mousedown)
        .on('mousemove', mousemove)
        .on('mouseup', mouseup)

    d3.select(window)
        .on('keydown', keydown)
        .on('keyup', keyup);
    //thisGraph.restart();


    $(function () {
        $(document.body).delegate(".delRowBtn", "click", function () {
            $(this).closest("tr").remove();
        });

    });
    PolicyGraphs.prototype.composedJson = function() {
        var myJson = pgData;
        myJson.policy_graph.nodes=[];
        myJson.policy_graph.edges=[];

        for (var k = 0; k < thisGraph.pgNodes.length; k++) {
            var id = thisGraph.pgNodes[k].id;
            var description = thisGraph.pgNodes[k].description;
            var endpoint_group,function_box;
            if(thisGraph.pgNodes[k].endpoint_group){
                endpoint_group = thisGraph.pgNodes[k].endpoint_group;
                myJson.policy_graph.nodes.push({id: id, endpoint_group:endpoint_group,description: description});
            }
            if(thisGraph.pgNodes[k].function_box){
                function_box = thisGraph.pgNodes[k].function_box;
                myJson.policy_graph.nodes.push({id: id, function_box:function_box,description: description});
            }

        }

        for (var k = 0; k < links.length; k++) {
            var direction = links[k].direction;
            var target = links[k].target.id;
            var source = links[k].source.id;
            var type = links[k].type;
            var classifiers = links[k].classifiers;


            myJson.policy_graph.edges.push({
                source: source,
                target: target,
                classifiers: classifiers,
                direction: direction,
                type: type

            });
        }


        var _json_stringify = JSON.stringify;
        JSON.stringify = function (value) {
            var _array_tojson = Array.prototype.toJSON;
            delete Array.prototype.toJSON;
            var r = _json_stringify(value);
            Array.prototype.toJSON = _array_tojson;
            return r;
        };

        document.getElementById("input_policy_graph_spec").value = JSON.stringify(myJson);
        console.log(myJson)

    }
    PolicyGraphs.prototype.submitform = function() {
        thisGraph.composedJson();
        document.getElementById("save_graph").submit();
    }
}

function addRowToTable(type, port, protocol) {
    PGA.tempClassifiers.push({protocol: protocol, dstport: port});
    $("#classifiers tr:nth-last-child(2)").after("<tr><td>" + port + "</td><td>" + protocol + "</td><td><button class='delRowBtn'>Delete</button></td></tr>");
    $("#port").val("");
    $("#protocol").val("");

}
function fnBxInputsOutput(table, name, value) {
    $("#"+table).append("<tr><td style='float: right;'>" + name + ":</td><td><input id='fn_"+name+"' value='" + value + "'></td><td></td></tr>");


}