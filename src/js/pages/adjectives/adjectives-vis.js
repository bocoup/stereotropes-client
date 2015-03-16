define(function(require) {

  var Backbone = require('backbone');
  var _ = require('lodash');
  var d3 = require('d3');
  var dataManager = require('../../data/data_manager');


  /**
   * The main visualization for the adjectives page.
   *
   * This visualization renders the top N (100) adjectives in a ring
   * connecting adjectives that co-occur together with arcs running through
   * the center.
   *
   * It also allows the user to select an adjective, when that happens,
   * the tropes associated with that adjective are displayed in the center of the
   * circle.
   *
   * @param {Object} options
   * @param {Object} options.data
   * @param {Object} options.container the dom element to render into
   *
   */
  function AdjectiveVis(options){
    var self = this;

    this.data = options.data;
    this.urlSelections = options.selections || {};
    this._container = options.container;

    // Holders for currenly selected adjectives and tropes
    // to allow us to have locked selections, as well as
    // mouseover interaction.
    this.currentlySelectedAdj = null;
    this.currentlySelectedTrope = null;


    // The tropes associated with the currently selected adjectives.
    this.associatedTropes = [];
    // Map of adjectives to tropes
    this.adjToTrope = _.reduce(this.data.trope_adj_network.links, function(memo,link){
      if(_.isUndefined(memo[link.target])){
        memo[link.target] = [];
      }
      memo[link.target].push(link.source);
      return memo;
    }, {});


    self.update();
    self.initialRender();

    dataManager.getTropes().then(function(tropes){
      self.tropeInfo = _.reduce(tropes, function(memo, ti){
        memo[ti.id] = ti;
        return memo;
      }, {});
    });

    // Add event support to this object so that we can alert
    // external components of when a trope is selected.
    _.extend(this, Backbone.Events);
  }


  /**
   * Update scales and metrics in preparation for rendering.
   *
   * Should be called before an initial render or if the data
   * or dimensions associated with the visualization change.
   */
  AdjectiveVis.prototype.update = function() {
    var self = this;
    this.container = d3.select(this._container);

    var minWidth = 760;
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

    // Finds a given node by name in the adjective-adjective tree.
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

    // We filter out links that connect adjectives whose appearance together in
    // tropes is below a certain threshold.
    this.links = this.links.filter(function(link) {
      return link.weight > 10;
    });

  };

  /**
   * Initial rendering function. Expected to be called
   * only once. Adds basic elements to the container.
   *
   */
  AdjectiveVis.prototype.initialRender = function() {
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


  /**
   * Render the visualization.
   *
   */
  AdjectiveVis.prototype.render = function() {
    // Adjust dimensions in case things have been resized.
    this.container.select('svg')
      .attr('height', this.height)
      .attr('width', this.width);

    this.container.select('g.vis-group')
      .attr("transform", "translate(" + this.radius + "," + this.radius + ")");


    // Note: this.urlSelections will be modified once the state specified by them
    // has been restored.
    this.renderAdjAdjNetwork(this.urlSelections.adjectives);
    this.renderLinkedTropes(this.urlSelections.tropes);
  };


  /**
   * Render the adjective to adjective network, this is comprised
   * of a 'ring' of adjectives connected by arcs indicating which ones
   * co-occur.
   *
   * It uses an edge bundling algorithm that expects a tree of nodes
   * so we place all our actual nodes (the adjectives)
   * under an invisible root node.
   *
   */
  AdjectiveVis.prototype.renderAdjAdjNetwork = function(selectedAdj) {
    var self = this;

    var bundle = d3.layout.bundle();
    var line = d3.svg.line.radial()
      .interpolate('bundle')
      .tension(0.85)
      .radius(function(d) { return d.y; })
      .angle(function(d) { return d.x / 180 * Math.PI; });

    //
    // Render Links
    //
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

    //
    // Render Nodes
    //
    // We first append the all the elements that make up a node. Then
    // later update them with rendering attributes.
    //
    var node = this.adjAdjNode.selectAll(".node")
      .data(this.nodes.filter(function(n) { return !n.children; }));

    var nodeEnter = node.enter()
      .append("g")
      .attr("class", "node")
      .on("mouseover", mouseovered)
      .on("mouseout", mouseouted)
      .on("click", mouseclicked);

    // This rect is an invisible one to capture mouse gestures over
    // a larger region than is actually by the other discrete elements
    // in the group.
    nodeEnter.append("rect")
      .attr("class", "node-mouse");

    nodeEnter.append("text")
      .attr("class", "node-text");

    // The adjective occurrence bar
    nodeEnter.append("rect")
      .attr("class", "node-rect");

    // The numeric annotation for the occurrence bar.
    nodeEnter.append("text")
      .attr("class", "node-text count");


    // Start updating the elements of a node with their current
    // rendering attributes.

    node
      .attr("transform", function(d) {
        return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)";
      });

    node.selectAll('rect.node-mouse')
      .attr("width", "200px")
      .attr("height", function(d, i){
        d._mouseRectHeight = 12;
        return d._mouseRectHeight;
      })
      .attr("x", "0px")
      .attr("y", function(d){ return -d._mouseRectHeight/2; })
      .attr('fill', 'white')
      .attr('stroke', 'none');

    node.selectAll('text.node-text')
      .attr("dy", ".31em")
      .attr("transform", function(d) {
          return (d.x < 180 ? "" : "rotate(180)");
      })
      .style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .text(function(d) { return d.name; });


    var barOffset = 100;
    node.selectAll('rect.node-rect')
      .attr("width", function(d, i){ return self.rectScale(d.trope_count); })
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


    node.selectAll("text.count")
      .attr("transform", function(d) {
          return (d.x < 180 ? "" : "rotate(180)");
      })
      .attr("dy", ".31em")
      .attr("x", function(d, i){
        // we position the count based on the
        // size of the rect (bar) that precedes it.
        // we also have to adjust for text anchor and positioning
        // based on where along the circle it is so it does not
        // look reversed.
        var sign = d.x < 180 ? 1 : -1;
        var rect = d3.select(this)[0][0].previousSibling;
        var bb = rect.getBBox();
        return (barOffset + 5 + bb.width) * sign;
      })
      .style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .text(function(d) { return d.trope_count; });



    //
    //  Helper functions for interaction.
    //



    // Handle mouseover
    //
    // To support locked selections, it will check if there is a selected
    // adjective before adjusting what should be highlighted. Thus this handler
    // is stateful (depends on self.currentlySelectedAdj)
    function mouseovered(d) {
      if(_.isNull(self.currentlySelectedAdj)){
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

      } else {
        return;
      }
    }


    // Handle mouseout
    //
    // To support locked selections, it will check if there is a selected
    // adjective before adjusting what should be unhighlighted. Thus this handler
    // is stateful (depends on self.currentlySelectedAdj)
    function mouseouted() {
      if(_.isNull(self.currentlySelectedAdj)){
        link
          .classed("link-source", false)
          .classed("link-target", false);

        node
          .classed("node-target", false)
          .classed("node-source", false);

        node.classed("active", false);
      } else {
        return;
      }
    }

    // Handle clicking on adjectives. Basically uses the mouseout and mouseover
    // functions to lock a selection and highlight it.
    function mouseclicked(d) {
      mouseouted();
      self.currentlySelectedAdj = null;
      mouseovered(d);

      self.currentlySelectedAdj = d;
      self.currentlySelectedTrope = null;
      self.trigger('tropeSelected', null);

      self.render();
      self.trigger('adjectiveClicked', d.name);
    }


    // Dismiss selections
    this.bgRect.on('click', clearSelection);
    function clearSelection(){
      self.currentlySelectedAdj = null;
      self.currentlySelectedTrope = null;
      mouseouted();
      self.trigger('selectionCleared');
      self.render();
    }

    if (selectedAdj) {
      //Find the node for this adjective and 'click' it.
      node.each(function(d, i){
        if ((d.name) === selectedAdj) {
          // Call mouseclick in a setTimeout so that we
          // will not be in an infinite loop. The function
          // queueing aspect of setTimeout is what we are particuarly
          // interested rather than the specific timeout.
          //
          // We also clear the trope url selection once the
          // requested state has been restored.
          setTimeout(function(){
            self.urlSelections.adjectives = undefined;
            mouseclicked(d);
          }, 20);
        }
      });
    }

  };

  /**
   * Get tropes associated with a adjective. Basically a helper
   * for the next function.
   *
   * @param  {String} adjective
   * @return {Object} an array of trope information objects
   *                  these have the same information as returned
   *                  by DataManager.getTrope
   */
  AdjectiveVis.prototype.getTropes = function(adjective) {
    var tropes = this.adjToTrope[adjective];
    if(_.isUndefined(tropes)){
      return [];
    } else {
      return tropes;
    }
  };


  /**
   * Render the tropes linked to a selected adjective.
   *
   * These are rendered using a force directed layout.
   */
  AdjectiveVis.prototype.renderLinkedTropes = function(selectedTrope) {
    var self = this;

    // This is the maximum number of nodes at which we will
    // render them full size.
    var maxFullSizeNodes = 65;

    var nodeWidth = 85;
    var nodeHeight = 20;

    var nodeWidthSmall = 20;

    // Adjust the currently selection of visible tropes
    // because we may be going from one se to another and some
    // may remain, we need to add new ones and remove old ones
    // while keeping existing ones.
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

      // We set the initial position of new nodes to random spots
      // in a smallish window around the center of the vis.
      _.each(newTropes, function(tropeName){
        if(!_.include(oldTropes, tropeName)){
          self.associatedTropes.push({
            width: nodeWidth,
            height: nodeHeight,
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

    // I don't think this is working, but it is an attempt to better
    // control where the nodes center around. So ignore it for now.
    // TODO: Fix
    var data = this.associatedTropes;
    data.unshift({
      name: "",
      radius: 0,
      fixed: true,
      x: this.width / 2 - 80,
      y: this.height / 2 - 20
    });

    // The force layout, these parameters
    // will need to be tweaked, so still a WIP.
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


    // Start the force layout alg and then render the nodes.
    this.force.nodes(data);
    this.force.start();

    var svg = this.container.select('svg');

    data = data.slice(1);
    var nodes = svg.selectAll("g.tropeNode")
        .data(data, function(t) { return t.name; });


    // Append the nodes in the force layout.

    var node = nodes.enter()
      .append("g")
      .attr("class", "tropeNode")
      .style('opacity', 1)
      .on("mouseover", tropeMouseoverHelper)
      .on("mouseout", tropeMouseoutHelper)
      .on("click", tropeMouseclicked);

    node.append("rect")
      .attr("class", function(d, i) {
        var info = self.tropeInfo[d.name];
        return "trope-node-bg " + (info.gender === 'm' ? 'male' : 'female');
      });

    node.append("text")
      .attr("class", function(d, i) {
        var info = self.tropeInfo[d.name];
        return "trope-node-label " + (info.gender === 'm' ? 'male' : 'female');
      })
      .attr("dy", "14px")
      .attr("dx", "5px")
      .style("text-anchor", "start");

    // Update the nodes and start them updating in a tick function

    nodes.classed('active', function(d){
      return d === self.currentlySelectedTrope;
    });

    nodes.selectAll('rect.trope-node-bg')
      .attr("width", function(d) {
        if(data.length > maxFullSizeNodes) {
          return nodeWidthSmall;
        }
        return d.width;
      })
      .attr("height", function(d) {
        return d.height;
      });

    nodes.selectAll('text.trope-node-label')
      .text(function(d) {
        var info = self.tropeInfo[d.name];
        var name = info.name.toLowerCase();

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
      nodes.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    });



    //
    // On mouse interactions with tropes we primarily trigger events for
    // external handling.
    //

    function tropeMouseoverHelper(d){
      if(_.isNull(self.currentlySelectedTrope)){
        self.trigger('tropeSelected', d.name);
        self.render();
      } else {
        return;
      }
    }

    function tropeMouseoutHelper(d){
      if(_.isNull(self.currentlySelectedTrope)){
        self.trigger('tropeSelected', null);
        self.render();
      } else {
        return;
      }
    }

    function tropeMouseclicked(d){
      self.currentlySelectedTrope = d;
      self.trigger('tropeSelected', d.name);
      self.trigger('tropeClicked', d.name);
      self.render();
    }

    if (selectedTrope) {
      //Find the node for this trope and 'click' it.
      nodes.each(function(d, i){
        if ((d.name) === selectedTrope) {
          // Call mouseclick in a setTimeout so that we
          // will not be in an infinite loop. The function
          // queueing aspect of setTimeout is what we are particuarly
          // interested rather than the specific timeout.
          //
          // We also clear the trope url selection once the
          // requested state has been restored.
          //
          // Its particularly important to do that here because
          // the trope nodes need to be rendered and that will not
          // happen until the adjective is selected.
          setTimeout(function(){
            self.urlSelections.tropes = undefined;
            tropeMouseclicked(d);
          }, 20);
        }
      });
    }

  };


  return AdjectiveVis;

});
