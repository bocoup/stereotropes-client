define(function(require) {

  var _ = require('lodash');
  var d3 = require('d3');
  var dataManager = require('../../data/data_manager');
  var tropeBlurbTmpl = require('tmpl!../adjectives/trope-blurb');

  function AdjectiveVis(options){
    var self = this;
    this.data = options.data;
    this._container = options.container;
    this.currentlySelectedAdj = null;
    this.currentlySelectedTrope = null;

    this.associatedTropes = [];


    this.update();

    // Prime the trope info cache for quick access later
    dataManager.getTrope("").then(function(){
      self.init();
      self.render();
    });

    // TODO: consider whether this should live outside this component
    // for now i'm putting the logic to update the blurb here to test
    // it out.
    this.originalBlurb = d3.select('.blurb').html();
    console.log(this.originalBlurb);
  }

  AdjectiveVis.prototype.getTropes = function(adjective) {
    var tropes = this.adjToTrope[adjective];
    if(_.isUndefined(tropes)){
      return [];
    } else {
      return tropes;
    }
  };

  AdjectiveVis.prototype.update = function() {
    var self = this;
    this.container = d3.select(this._container);

    var minWidth = 960;
    this.width = _.max([parseInt(this.container.style('width'), 10), minWidth]);
    this.height = this.width;

    this.diameter = this.width;
    this.radius = this.diameter / 2;

    // The distance between the outside of the 'ring' and the edge of the svg container
    // this leaves space for the text and the bars.
    this.outerSpacing = 250;
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
      .range([0, (this.outerSpacing / 3)]);


    // Prepare the node and link data.

    // Find a given node by name in the adjective-adjective tree.
    function findNode(root, name) {
      return _.find(root.children, function(node){
        return node.name === name;
      });
    }

    var cluster = d3.layout.cluster()
      .size([360, this.innerRadius])
      .sort(null)
      .value(function(d) { return d.size; });

    this.nodes = cluster.nodes(self.adjAdjroot);
    this.links = this.data.adj_adj_network.links.map(function(link){
      var source = findNode(self.adjAdjroot, link.source);
      var target = findNode(self.adjAdjroot, link.target);
      return {
        'source': source,
        'target': target,
        'weight': link.weight
      };
    });

    this.links = this.links.filter(function(link) {
      return link.weight > 10;
    });

    // Prepare adj to trope data

    this.adjToTrope = _.reduce(this.data.trope_adj_network.links, function(memo,link){
      if(_.isUndefined(memo[link.target])){
        memo[link.target] = [];
      }
      memo[link.target].push(link.source);
      return memo;
    }, {});



  };

  AdjectiveVis.prototype.init = function() {
    var svg = this.container.append('svg')
      .attr('height', this.height)
      .attr('width', this.width);

    // debug rect
    this.bgRect = svg.append('rect')
      .attr('class', 'background')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'white');
      // .attr('fill', '#e1e1e1');

    var g = svg.append("g")
      .attr("class", "vis-group");

    this.adjAdjLink = g.append("g");
    this.adjAdjNode = g.append("g");
  };

  AdjectiveVis.prototype.render = function() {
    this.container.select('svg')
      .attr('height', this.height)
      .attr('width', this.width);

    this.container.select('g.vis-group')
      .attr("transform", "translate(" + this.radius + "," + this.radius + ")");

    this.renderAdjAdjNetwork();
    this.renderLinkedTropes();
    this.showTropeDetails();
  };


  AdjectiveVis.prototype.renderAdjAdjNetwork = function() {
    var self = this;

    var bundle = d3.layout.bundle();

    var line = d3.svg.line.radial()
      .interpolate('bundle')
      .tension(0.85)
      .radius(function(d) { return d.y; })
      .angle(function(d) { return d.x / 180 * Math.PI; });

    //Render Links
    var link = this.adjAdjLink.selectAll(".link")
        .data(bundle(this.links), function(link) {
          return _.pluck(link, "name").join("");
        });

    link.enter()
      .append("path")
      .attr("class", "link");

    link.each(function(d) {
        d.source = d[0];
        d.target = d[d.length - 1];
      })
      .attr("d", line);

    //Render Nodes
    var node = this.adjAdjNode.selectAll(".node")
      .data(this.nodes.filter(function(n) { return !n.children; }));

    var nodeEnter = node.enter()
      .append("g")
      .attr("class", "node")
      .on("mouseover", mouseoverHelper)
      .on("mouseout", mouseoutHelper)
      .on("click", mouseclicked);

    nodeEnter.append("rect")
      .attr("class", "node-mouse");

    nodeEnter.append("text")
      .attr("class", "node-text");

    nodeEnter.append("rect")
      .attr("class", "node-rect");

    nodeEnter.append("text")
      .attr("class", "node-text count");


    // Overall group for the node elements
    node
      .attr("transform", function(d) {
        return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)";
      });


    // An invisible rect that is there to capture mouse events.
    node.selectAll('rect.node-mouse')
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


    // The adjective text
    node.selectAll('text.node-text')
      .attr("dy", ".31em")
      .attr("transform", function(d) {
          return (d.x < 180 ? "" : "rotate(180)");
      })
      .style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .text(function(d) { return d.name; });


    // The adjective occurrence bar
    var barOffset = 100;
    node.selectAll('rect.node-rect')
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
        return barOffset;
      })
      .attr("y", function(d){
        return -d._rectHeight/2;
      });


    // The adjective occurrence count
    node.selectAll("text.count")
      .attr("transform", function(d) {
          return (d.x < 180 ? "" : "rotate(180)");
      })
      .attr("dy", ".31em")
      .attr("x", function(d, i){
        var sign = d.x < 180 ? 1 : -1;
        var rect = d3.select(this)[0][0].previousSibling;
        var bb = rect.getBBox();
        return (barOffset + 5 + bb.width) * sign;
      })
      .style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .text(function(d) { return d.trope_count; });


    // Helper functions for interaction.
    function mouseoverHelper(d) {
      if(_.isNull(self.currentlySelectedAdj)){
        mouseovered(d);
      } else {
        return;
      }
    }

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

    function mouseoutHelper() {
      if(_.isNull(self.currentlySelectedAdj)){
        mouseouted();
      } else {
        return;
      }
    }

    function mouseouted() {
      link
        .classed("link-source", false)
        .classed("link-target", false);

      node
        .classed("node-target", false)
        .classed("node-source", false);

      node.classed("active", false);
    }

    function mouseclicked(d) {
      self.currentlySelectedAdj = d;
      self.render();
      mouseouted(d);
      mouseovered(d);
    }

    this.bgRect
      .on('click', clearAdjSelection);

    function clearAdjSelection(){
      self.currentlySelectedAdj = null;
      mouseoutHelper();
      self.render();
    }

  };


  AdjectiveVis.prototype.renderLinkedTropes = function() {
    var self = this;

    var maxFullSizeNodes = 65;

    if(_.isNull(this.currentlySelectedAdj)){
      this.associatedTropes = [];
    } else {
      var newTropes = this.getTropes(this.currentlySelectedAdj.name);
      var oldTropes = _.pluck(this.associatedTropes, "name");

      var toRemove = [];
      _.each(this.associatedTropes, function(trope){
        if(!_.include(newTropes, trope.name)){
          toRemove.push(trope);
        }
      });

      _.each(newTropes, function(tropeName){
        if(!_.include(oldTropes, tropeName)){
          self.associatedTropes.push({
            width: 85,
            height: 20,
            name: tropeName,
            x: -(Math.random() * 100) + (Math.random() * 100) + self.width / 2,
            y: -(Math.random() * 100) + (Math.random() * 100) + self.height / 2
          });
        }
      });

      toRemove = _.pluck(toRemove, "name");
      this.associatedTropes = _.reject(this.associatedTropes, function(trope){
        return _.include(toRemove, trope.name);
      });

    }

    var data = this.associatedTropes;
    data.unshift({
      name: "",
      radius: 0,
      fixed: true,
      x: this.width / 2 - 80,
      y: this.height / 2 - 20
    });

    this.force = d3.layout.force()
      .gravity(0.55)
      // .linkDistance(100)
      // .charge(-2000)
      .charge(function(d, i) {
        if (i === 0) {
          return 0;
        }

        if(data.length > maxFullSizeNodes) {
          return -200;
        } else {
          return -600;
        }
      })
      .size([this.width, this.height]);

    this.force.nodes(data);
    this.force.start();

    var svg = this.container.select('svg');

    var nodes = svg.selectAll("g.tropeNode")
        .data(data.slice(1), function(t) { return t.name; });

    var nodeEnter = nodes.enter();

    var node = nodeEnter
      .append("g")
      .attr("class", "tropeNode")
      .style('opacity', 1)
      .on("mouseover", tropeMouseoverHelper)
      .on("mouseout", tropeMouseoutHelper)
      .on("click", tropeMouseclicked);

    node.append("rect")
      .attr("class", function(d, i) {
        // TEMPORARY. Replace with a call in the constructor
        // to getTropes so we can call this sync.
        var info = dataManager.cache['tropes_basic'][d.name];
        return "trope-node-bg " + (info.gender === 'm' ? 'male' : 'female');
      });


    node.append("text")
      .attr("class", "trope-node-label")
      .attr("dy", "14px")
      .attr("dx", "5px")
      .style("text-anchor", "start");


    // Update the nodes
    nodes.selectAll('rect.trope-node-bg')
      .attr("width", function(d) {
        if(data.length > maxFullSizeNodes) {
          return 20;
        }
        return d.width;
      })
      .attr("height", function(d) {
        return d.height;
      });

    nodes.selectAll('text.trope-node-label')
      .text(function(d) {
        // TEMPORARY. Replace with a call in the constructor
        // to getTropes so we can call this sync.
        var name = dataManager.cache['tropes_basic'][d.name].name.toLowerCase();
        if(name.length > 10) {
          name = name.substring(0, 8) + '…';
        }

        if(data.length > maxFullSizeNodes) {
          name = name[0];
        }

        return name;
      });


    // Fade out expired nodes.
    nodes.exit()
      .transition()
        .duration(500)
        .style('opacity', 0)
        .remove();


    this.force.on("tick", function(e) {
      nodes
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    });


    function tropeMouseoverHelper(d){
      self.currentlySelectedTrope = d;
      self.render();
    }

    function tropeMouseoutHelper(d){
      self.currentlySelectedTrope = null;
      self.render();
    }

    function tropeMouseclicked(){

    }

  };

  AdjectiveVis.prototype.showTropeDetails = function() {
    if(_.isNull(this.currentlySelectedTrope)){
      d3.select('.blurb').html(this.originalBlurb);
    } else {
      dataManager.getTropeDetails(this.currentlySelectedTrope.name).then(function(details){
        var html = tropeBlurbTmpl(details);
        d3.select('.blurb').html(html);
      });
    }
  };

  return AdjectiveVis;

});
