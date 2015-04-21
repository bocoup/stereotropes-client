define(function(require) {

  var Backbone = require('backbone');
  var _ = require('lodash');
  var d3 = require('d3');
  var Promise = require('bluebird');
  var $ = require('jquery');

  var dataManager = require('../../data/data_manager');

  var TropeTile = require('../trope/trope-tile');
  var TropeDetails = require('../trope/trope-detail-header');
  var Analytics = require("../../shared/analytics");
  var Mobile = require("../../shared/mobile");

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

    var minWidth = 960;
    if (Mobile.medium()) {
      minWidth = 569;
    } else if (Mobile.large()) {
      minWidth = 768;
    }

    this.width = _.max([parseInt(this.container.style('width'), 10), minWidth]);
    this.height = this.width;

    this.diameter = this.width;
    this.radius = this.diameter / 2;

    // The distance between the outside of the 'ring' and the edge of the svg container
    // this leaves space for the text and the bars.
    this.outerSpacing = 240;

    if (Mobile.medium()) {
      this.outerSpacing = 160;
    } else if (Mobile.large()) {
      this.outerSpacing = 200;
    }

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
      .range([0, (this.outerSpacing / 8)]);


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
      // .attr('fill', '#d1d1d1');

    var g = svg.append("g")
      .attr("class", "vis-group");

    this.adjAdjLink = g.append("g");
    this.adjAdjNode = g.append("g");


    this.detailsContainer = this.container.append('div')
      .attr('id', 'details-container');
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
      .attr("transform", "translate(" + this.radius + "," + (this.radius - (this.outerSpacing / 10)) + ")");


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
      .attr("class", "node-text label");

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
        d._mouseRectHeight = 11;
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


    var barOffset = 115;
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
      self.trigger('tropeClicked', null);

      self.render();
      self.trigger('adjectiveClicked', d.name);

      self.hideTropeDetails();
      Analytics.trackEvent("adjectives-page", "adjective", d.name);
    }


    // Dismiss selections
    this.bgRect.on('click', clearSelection);
    function clearSelection(){
      self.currentlySelectedAdj = null;
      self.currentlySelectedTrope = null;
      mouseouted();
      self.trigger('selectionCleared');
      self.render();
      self.hideTropeDetails();
      Analytics.trackEvent("adjectives-page", "clear");
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
      // We also try to bias the initial position of the trope based on
      // its associated gender.
      _.each(newTropes, function(tropeName){
        if(!_.include(oldTropes, tropeName)){

          var x,y;
          var trope = self.tropeInfo[tropeName];
          if (trope.gender === 'm') {
            x = this.width/2 + 50 - (Math.random() * 25) + (Math.random() * 25);
          } else {
            x = this.width/2 - 50 - (Math.random() * 25) + (Math.random() * 25);
          }
          y = -(Math.random() * 75) + (Math.random() * 75) + self.height / 2;

          self.associatedTropes.push({
            width: nodeWidth,
            height: nodeHeight,
            name: tropeName,
            x: x,
            y: y
          });
        }
      });

      toRemove = _.pluck(toRemove, "name");
      this.associatedTropes = _.reject(this.associatedTropes, function(trope){
        return _.include(toRemove, trope.name);
      });

    }

    var data = this.associatedTropes;

    this.force = d3.layout.force()
      .gravity(0.4)
      .charge(function(d, i) {
        if(data.length > maxFullSizeNodes) {
          return -500;
        } else {
          return -2000;
        }
      })
      .size([this.width, this.height]);


    var centerOffsetX = nodeWidth;
    if(data.length > maxFullSizeNodes) {
      centerOffsetX = nodeWidthSmall;
    }
    centerOffsetX = centerOffsetX / 2;

    var centers = {
      'm': {x: this.width/2 + 50 - centerOffsetX, y: this.height / 2 - this.outerSpacing / 4},
      'f': {x: this.width/2 - 50 - centerOffsetX, y: this.height / 2 - this.outerSpacing / 4}
    };


    this.force.on("tick", function(e) {
      // Stop updating the force layout at low values of alpha
      // this helps is 'settle' faster.
      if(e.alpha < 0.06) {
        return;
      }

      nodes.attr("transform", function(d) {
        var trope = self.tropeInfo[d.name];
        var target = centers[trope.gender];

        var damper = 1.9;

        var dx = d.x + (target.x - d.x) * (damper) * e.alpha;
        var dy = d.y + (target.y - d.y) * (damper) * e.alpha;

        // Store the new dx and dy on the x and y attributes so that
        // the force layout can continue to update them.
        d.x = dx;
        d.y = dy;

        return "translate(" + dx + "," + dy + ")";
      });
    });


    // Start the force layout alg and then render the nodes.
    this.force.nodes(data);
    this.force.start();

    var svg = this.container.select('svg');

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

        if(name.length > 13) {
          name = name.substring(0, 11) + '…';
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


    //
    // On mouse interactions with tropes we primarily trigger events for
    // external handling.
    //

    function tropeMouseoverHelper(d){

      self.trigger('tropeSelected', d.name);
      self.showTropeDetails(this, d);
      this.parentNode.appendChild(this);

      var node = this;
      nodes.classed('active', function(d){
        return this === node;
      });
    }

    function tropeMouseoutHelper(d){
      self.hideTropeDetails();
      self.trigger('tropeSelected', null);

      var node = this;
      nodes.classed('active', function(d){
        return this === node;
      });
    }

    function tropeMouseclicked(d){
      self.trigger('tropeClicked', d.name);
      Analytics.trackEvent("adjectives-page", "trope", d.name);
    }

  };


  /**
   * Hide the trope details overlay.
   */
  AdjectiveVis.prototype.hideTropeDetails = function(){
    var el = $('#details-container');
    el.hide();
  };


  /**
   * Displays a trope details overlay.
   *
   * Positioned near the node for that trope. Only one can be shown at
   * a time as we reuse the same container.
   *
   * @param  {[type]} tropeNode the svg node for the trop
   * @param  {[type]} tropeData the data associated with that node
   */
  AdjectiveVis.prototype.showTropeDetails = function(tropeNode, tropeData) {
    var self = this;

    var pos = $(tropeNode).offset();

      var tropeId = tropeData.name;
      dataManager.getTropeDetails(tropeId).then(function(details){
        var el = $('#details-container');

        var width = 500;
        var height = 150;
        var left = pos.left;
        var top = pos.top;

        if(left + width > $(window).width()) {
          var tw = d3.select(tropeNode).select('rect.trope-node-bg').attr('width');
          var nodeWidth = parseInt(tw, 10);
          left -= (width - nodeWidth);
        }

        if(top + 25 + height > $(window).height()) {
          top -= (height + 5);
        } else {
          top += 25;
        }

        el.css({left: left, top: top, width: width, height: height});

        self.tile = new TropeTile({ trope_id : tropeId });
        self.tropeDesc = new TropeDetails({
          trope_id : tropeId,
          show_trope_url: false,
          trope_url : '/tropes/' + tropeId,
          same_tab : true
        });

        Promise.settle([self.tile.render(), self.tropeDesc.render()]).then(function(){
          el.empty();
          el.append(self.tile.$el);
          el.append(self.tropeDesc.$el);

          el.show();
        });

      });
  };


  return AdjectiveVis;

});
