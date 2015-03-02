define(function(require) {

  var _ = require('lodash');
  var d3 = require('d3');

  function AdjectiveVis(options){
    this.data = options.data;
    this._container = options.container;

    this.init();
  }

  AdjectiveVis.prototype.update = function() {
    this.container = d3.select(this._container);

    this.width = 900;
    this.height = this.width;

    this.diameter = this.width;
    this.radius = this.diameter / 2;

    // The distance between the outside of the 'ring' and the edge of the svg container
    // this leaves space for the text and the bars.
    this.outerSpacing = 200;
    this.innerRadius = this.radius - this.outerSpacing;

    // This is the root of the adjective-adjective network (the nodes in the 'ring')
    // it is created as a shallow all with all the nodes under one root node
    this.adjAdjroot = {
      'name': '',
      'depth': 0,
      'children': this.data.adj_adj_network.nodes
    };

    var maxTropeCount = _.max(_.pluck(this.data.adj_adj_network.nodes, 'trope_count'));
    this.rectScale = d3.scale.linear()
      .domain([0, maxTropeCount])
      .range([0, (this.outerSpacing / 4)]);
  };

  AdjectiveVis.prototype.init = function() {
    this.container = d3.select(this._container);

    this.width = 900;
    this.height = this.width;

    this.container.append('svg')
      .attr('height', this.height)
      .attr('width', this.width);

    // debug rect
    // svg.append('rect')
    //   .attr('class', 'background')
    //   .attr('width', '100%')
    //   .attr('height', '100%')
    //   .attr('fill', '#e1e1e1');


  };

  AdjectiveVis.prototype.render = function() {
    this.renderAdjAdjNetwork();
  };


  AdjectiveVis.prototype.renderAdjAdjNetwork = function() {
    var self = this;

    var cluster = d3.layout.cluster()
      .size([360, this.innerRadius])
      .sort(null)
      .value(function(d) { return d.size; });

    var bundle = d3.layout.bundle();

    var line = d3.svg.line.radial()
      .interpolate('bundle')
      .tension(0.85)
      .radius(function(d) { return d.y; })
      .angle(function(d) { return d.x / 180 * Math.PI; });

    var svg = this.container.select('svg');


    var g = svg.append("g")
      .attr("transform", "translate(" + this.radius + "," + this.radius + ")");

    var link = g.append("g").selectAll(".link");
    var node = g.append("g").selectAll(".node");


    // Find a given node by name in the adjective-adjective tree.
    function findNode(root, name) {
      return _.find(root.children, function(node){
        return node.name === name;
      });
    }

    var nodes = cluster.nodes(self.adjAdjroot);
    var links = this.data.adj_adj_network.links.map(function(link){
      var source = findNode(self.adjAdjroot, link.source);
      var target = findNode(self.adjAdjroot, link.target);
      return {
        'source': source,
        'target': target,
        'weight': link.weight
      };
    });

    links = links.filter(function(link) {
      return link.weight > 10;
    });

    link = link
        .data(bundle(links))
      .enter().append("path")
        .each(function(d) {
          d.source = d[0];
          d.target = d[d.length - 1];
        })
        .attr("class", "link")
        .attr("d", line);

    node = node
      .data(nodes.filter(function(n) { return !n.children; }))
      .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
          return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)";
        })
        .on("mouseover", mouseovered)
        .on("mouseout", mouseouted);

    // An invisible rect that is there to capture mouse
    // events.
    node.append("rect")
      .attr("class", "node-mouse")
      .attr("width", "200px")
      .attr("height", function(d, i){
        d._rectHeight = 12;
        return d._rectHeight;
      })
      .attr("x", "0px")
      .attr("y", function(d){
        return -d._rectHeight/2;
      })
      .attr('fill', 'white')
      .attr('stroke', 'none');


    // Append the adjective text itself.
    node.append("text")
      .attr("class", "node-text")
      .attr("dy", ".31em")
      .attr("transform", function(d) {
          return (d.x < 180 ? "" : "rotate(180)");
      })
      .style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .text(function(d) { return d.name; });


    // Append a bar indicating how many tropes this term appears
    // in.
    node.append("rect")
      .attr("class", "node-rect")
      .attr("width", function(d, i){
        var w = self.rectScale(d.trope_count);
        d._rectWidth = w;
        return d._rectWidth;
      })
      .attr("height", function(d, i){
        d._rectHeight = 6;
        return d._rectHeight;
      })
      .attr("x", function(d, i){
        return 115;
      })
      .attr("y", function(d){
        return -d._rectHeight/2;
      });


    // Append the count labels for each term.
    // These are hidden until mouseover (using css).
    node.append("text")
      .attr("class", "node-text count")
      .attr("transform", function(d) {
          return (d.x < 180 ? "" : "rotate(180)");
      })
      .attr("dy", ".31em")
      .attr("x", function(d, i){
        var sign = d.x < 180 ? 1 : -1;
        var rect = d3.select(this)[0][0].previousSibling;
        var bb = rect.getBBox();
        return (120 + bb.width) * sign;
      })
      .style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .text(function(d) { return d.trope_count; });


    function mouseovered(d) {
      node.each(function(n) { n.target = n.source = false; });

      link
          .classed("link-source", function(l) {
            if (l.target === d) { return l.source.source = true; }
          })
          .classed("link-target", function(l) {
            if (l.source === d) { return l.target.target = true; }
          })
        .filter(function(l) { return l.target === d || l.source === d; })
          .each(function() { this.parentNode.appendChild(this); }); // Render these links on top

      node
          .classed("node-target", function(n) { return n.target; })
          .classed("node-source", function(n) { return n.source; });

      node.classed("active", function(n) { return n.name === d.name; });
    }

    function mouseouted(d) {
      link
          .classed("link-source", false)
          .classed("link-target", false);

      node
          .classed("node-target", false)
          .classed("node-source", false);

      node.classed("active", false);
    }
  };

  return AdjectiveVis;

});
