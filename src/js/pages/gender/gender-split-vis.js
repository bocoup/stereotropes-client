define(function(require) {

  var Backbone = require('backbone');
  var _ = require('lodash');
  var d3 = require('d3');
  var $ = require('jquery');
  var Analytics = require("../../shared/analytics");

  var DataManager = require('../../data/data_manager');

  var adjectiveDetailsTemplate = require("tmpl!../../pages/gender/adjective-details");
  var splitBarTemplate = require("tmpl!../../shared/gender-split-bar");

  function GenderSplitVis(options) {
    var self = this;

    this.data = _.clone(options.data, true);

    // Convert the female scores to negative values for the
    // scale we will use later which runs from -1 to 1.
    _.each(this.data['female'], function(adj) {
      adj.log_likelihood_norm = -adj.log_likelihood_norm;
      adj.gender = 'female';
    });

    _.each(this.data['male'], function(adj) {
      adj.gender = 'male';
    });

    this.urlSelections = options.selections || {};
    this._container = options.container;

    // Holders for currenly selected adjectives and tropes
    // to allow us to have locked selections, as well as
    // mouseover interaction.
    this.currentlySelectedAdj = null;


    self.update();
    self.initialRender();

    // Add event support to this object so that we can alert
    // external components of when a trope is selected.
    _.extend(this, Backbone.Events);
  }

  GenderSplitVis.prototype.update = function() {
    // var self = this;
    this.container = d3.select(this._container);

    var minWidth = 460;
    this.width = parseInt(this.container.style('width'), 10);
    this.height = 720;


    // If an adjective has a count greater than this then its text will always show in the vis
    this.alwaysShowTermThreshold = 25;

    var minOccurrencesMale = 8;
    var minOccurrencesFemale = 11;

    this.femaleAdj = _.filter(this.data['female'], function(adj) {
      return adj.count >= minOccurrencesFemale;
    });
    this.maleAdj = _.filter(this.data['male'], function(adj) {
      return adj.count >= minOccurrencesMale;
    });

    this.femaleAdj = _.sortBy(this.femaleAdj, function(adj){
      return -adj.count;
    });

    this.maleAdj = _.sortBy(this.maleAdj, function(adj){
      return -adj.count;
    });

    if (this.width < minWidth + 5) {
      this.femaleAdj = _.first(this.femaleAdj, 15);
      this.maleAdj = _.first(this.maleAdj, 15);
    }



    this.adjectives = this.femaleAdj.concat(this.maleAdj);

    //Set up scales

    var exp = 0.5;
    this.x  = d3.scale.pow()
      .exponent(exp)
      .domain([-1, 0, 1])
      .range([50, this.width / 2, this.width - 50]);

    this.fontSize = d3.scale.linear()
      .domain(d3.extent(_.map(this.adjectives, function(d){
        return d.count;
      })))
      .range([14, 32]);


    this.quadtreeFactory = d3.geom.quadtree()
      .extent([[-10, -10], [this.width + 10, this.height + 10]])
      .x(function(d) {
        return d.x;
      })
      .y(function(d) {
        return d.y;
      });
  };

  GenderSplitVis.prototype.initialRender = function() {
    var self = this;
    var svg = this.container.append('svg')
      .attr('height', this.height)
      .attr('width', this.width);

    // Background rect
    this.bgRect = svg.append('rect')
      .attr('class', 'background')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'white');
      // .attr('fill', '#e1e1e1'); // TODO remove

    var g = svg.append("g")
      .attr("class", "vis-group");

    g.append("line")
      .attr('class', 'female-line-top');

    g.append("line")
      .attr('class', 'male-line-top');

    g.append("line")
      .attr('class', 'female-line-bottom');

    g.append("line")
      .attr('class', 'male-line-bottom');

    g.append('text')
      .attr('class', 'female-section-label')
      .text('More Feminine');

    g.append('text')
      .attr('class', 'male-section-label')
      .text('More Masculine');

    this.adjectivesGroup = g.append("g")
      .attr('class', 'adjectives-group');

    this.femaleAdjGroup = g.append("g")
      .attr('class', 'female-adjs');
    this.maleAdjGroup = g.append("g")
      .attr('class', 'male-adjs');


    this.detailsContainer = this.container.append('div')
      .attr('id', 'details-container');

    // Mouse handler
    //
    svg.on('mousemove', function(){
      var coord = d3.mouse(this);
      self.showNearbyNodes(coord[0], coord[1]);
    });
  };


  GenderSplitVis.prototype.render = function() {
    this.boundingBoxes = [];

    this.container.select('svg')
      .attr('height', this.height)
      .attr('width', this.width);

    this.renderAxesAndTitles();
    this.renderAdjectives(this.adjectives);

    this.quadtree = this.quadtreeFactory(this.boundingBoxes);
  };

  GenderSplitVis.prototype.renderAxesAndTitles = function() {
    this.container.select('line.female-line-top')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', this.width / 2)
      .attr('y2', 0);

    this.container.select('line.male-line-top')
      .attr('x1', this.width / 2)
      .attr('y1', 0)
      .attr('x2', this.width)
      .attr('y2', 0);

    this.container.select('line.female-line-bottom')
      .attr('x1', 0)
      .attr('y1', this.height)
      .attr('x2', this.width / 2)
      .attr('y2', this.height);

    this.container.select('line.male-line-bottom')
      .attr('x1', this.width / 2)
      .attr('y1', this.height)
      .attr('x2', this.width)
      .attr('y2', this.height);

    this.container.select('text.female-section-label')
      .attr('x', 0)
      .attr('y', 30)
      .attr('text-anchor', 'start');

    this.container.select('text.male-section-label')
      .attr('x', this.width - 5)
      .attr('y', 30)
      .attr('text-anchor', 'end');


  };

  GenderSplitVis.prototype.renderAdjectives = function(data) {
    var self = this;

    var adjective = this.adjectivesGroup.selectAll('.adjective')
      .data(data, function(d) { return d.id; });

    var adjectiveEnter = adjective.enter()
      .append('g')
      .attr('class', function(d){
        return 'adjective ' + d.gender;
      })
      .attr('transform', function(d) {
        var x = d.gender === 'female' ? -250 : self.width + 250;
        var y = Math.random() * self.height;

        return "translate(" + x + "," + y + ")";
      })
      .on('mouseover', mouseovered)
      .on('mouseout', mouseouted)
      .on('click', mouseclicked);

    adjectiveEnter.append("rect")
      .attr("class", function(d){
        return "node-bg " + d.gender;
      });

    adjectiveEnter.append("text")
      .attr("class", "node-text")
      .attr('text-anchor', 'middle')
      .attr('opacity', function(d) {
        if(d.count > self.alwaysShowTermThreshold) {
          return 1;
        } else {
          return 0;
        }
      })
      .text(function(d) { return d.id; });


    adjective.selectAll('text.node-text')
      .style('font-size', function(d, i) {
        return self.fontSize(d.count) + "px";
      });


    var direction = 0;
    function getNextFreeSpace(bb, allBoundingBoxes) {
      var potential = _.extend({}, bb);

      var sx1 = potential.x;
      var sy1 = potential.y;
      var sx2 = potential.x + potential.width;
      var sy2 = potential.y + potential.height;

      // If a collision is detected while we are looping through
      // we will continue checking against the rest of the bounding
      // boxes in case the
      var reLoop = false;

      for (var i = 0; i < allBoundingBoxes.length; i++) {
        var target = allBoundingBoxes[i];

        var tx1 = target.x;
        var ty1 = target.y;
        var tx2 = target.x + target.width;
        var ty2 = target.y + target.height;

        var intersects = (sx1 < tx2 && sx2 > tx1 && sy1 < ty2 && sy2 > ty1);
        if (intersects) {
          reLoop = true;
          var sign = direction % 2 === 0 ? -1 : 1;
          potential.y += potential.height * sign;
          sy1 = potential.y;
          sy2 = potential.y + potential.height;
        }

        if(i === allBoundingBoxes.length - 1 && reLoop ){
          i = 0;
          reLoop = false;
        }
      }

      direction += 1;
      return potential;
    }

    var transitionDuration = 200;

    adjective
      .transition()
      .duration(transitionDuration)
      .attr('transform', function(d) {
        var vPadding = 2;
        var hPadding = 5;
        var bb = d3.select(this).select('text.node-text').node().getBBox();

        var x = self.x(d.log_likelihood_norm);
        var y = (self.height / 2);

        var width = bb.width;
        var height = bb.height;

        var pos = getNextFreeSpace({
          x: x,
          y: y,
          width: width + hPadding,
          height: height + vPadding,
          data: d,
          node: this
        }, self.boundingBoxes);

        // Clamp y values to the bounding box of the chart
        // this also makes sure the quadTree wont throw exceptions
        // on traversal.
        if (pos.y > self.height - 20) {
          pos.y = self.height - 20;
        }

        if (pos.y < 20) {
          pos.y = 20;
        }

        self.boundingBoxes.push(pos);

        return "translate(" + pos.x + "," + pos.y + ")";
      });

    adjective.selectAll('rect.node-bg')
      .transition()
      .duration(transitionDuration)
      .call(positionAdjectiveBackground);

      function positionAdjectiveBackground(d, i, highlight) {
        this
          .attr('opacity', 0.35)
          .attr('stroke', 'none')
          .each(function(d, i) {
            var text = this.nextSibling;
            var bb = text.getBBox();

            var x,y, width, height;

            if (d === self.currentlySelectedAdj || highlight) {
              x = -(bb.width/2) - 6;
            } else {
              x = -bb.width/2;
            }

            if (d === self.currentlySelectedAdj || highlight) {
              y = -bb.height + 1;
            } else {
              y = -bb.height / 4;
            }

            if (d === self.currentlySelectedAdj || highlight) {
              height = bb.height + 8;
            } else {
              height = bb.height / 2;
            }

            if (d === self.currentlySelectedAdj || highlight) {
              width =  bb.width + 12;
            } else {
              width = bb.width + 10;
            }


            var pos = {
              x: x, y: y, width: width, height: height
            };

            d3.select(this)
              .transition()
              .duration(50)
              .attr(pos);
          });
      }


      adjective.exit()
        .remove();


      //Mouse Handlers

      // Handle mouseover
      //
      // To support locked selections, it will check if there is a selected
      // adjective before adjusting what should be highlighted.
      function mouseovered(d) {
        if(_.isNull(self.currentlySelectedAdj)){
          self.container.select('svg').selectAll('g.adjective').classed('active', false);
          d3.select(this).classed('active', true);
          this.parentNode.appendChild(this);
        } else {
          return;
        }
      }


      // Handle mouseout
      //
      // To support locked selections, it will check if there is a selected
      // adjective before adjusting what should be unhighlighted.
      function mouseouted() {
        if(_.isNull(self.currentlySelectedAdj)){
          d3.select(this).classed('active', false);
        } else {
          return;
        }
      }

      // Handle clicking on adjectives. Basically uses the mouseout and mouseover
      // functions to lock a selection and highlight it.
      function mouseclicked(d) {
        if(self.currentlySelectedAdj === d){
          self.currentlySelectedAdj = null;
          mouseouted.bind(this)();
          self.hideAdjectiveDetailOverlay();
        } else {
          mouseouted.bind(this)();
          self.currentlySelectedAdj = null;
          mouseovered.bind(this)(d);
          self.currentlySelectedAdj = d;
          var node = this;
          setTimeout(function(){
            self.showAdjectiveDetailOverlay(node, d);
          }, 50);
          Analytics.trackEvent("gender-page", "adjective", d.id);
        }

        self.container.selectAll('rect.node-bg')
            .transition()
            .duration(50)
            .call(positionAdjectiveBackground);


      }
  };


  /**
   * This will looks for adjectives near the mouse and make the text fade in.
   *
   * The text of nodes outside the range will be faded out unless they are
   * have a certain count associated which results in them being always visible
   *
   * @param  {Number} mouseX
   * @param  {Number} mouseY
   */
  GenderSplitVis.prototype.showNearbyNodes = function(mouseX, mouseY) {
    var self = this;

    // We need to fadeOut all the nodes
    var allText = this.container.select('svg').selectAll('text.node-text').filter(function(d, i){
      return d.count < self.alwaysShowTermThreshold && d !== self.currentlySelectedAdj;
    });

    allText
      .transition()
      .duration(50)
      .attr('opacity', 0);

    // We then search for nodes near the mouse and show their text

    function search(quadtree, x0, y0, x3, y3) {
      quadtree.visit(function(node, x1, y1, x2, y2) {
        var p = node.point;
        if (p) {
          p.selected = (p.x >= x0) && (p.x < x3) && (p.y >= y0) && (p.y < y3);

          var textNode = d3.select(p.node).selectAll('text.node-text');
          if (p.selected) {
            textNode
              .transition()
              .duration(50)
              .attr('opacity', 1);
          }
        }
        return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
      });
    }

    var boxSize = 100;
    search(this.quadtree, mouseX - boxSize, mouseY - boxSize, mouseX + boxSize, mouseY + boxSize);
  };


  /**
   * Show the overlay for an adjective when it is selected.
   *
   * This will display associated tropes and some extra stats about
   * the adjective.
   *
   * @param  {DOMNode} adjectiveNode
   * @param  {Object} adjectiveData
   */
  GenderSplitVis.prototype.showAdjectiveDetailOverlay = function(adjectiveNode, adjectiveData){

    DataManager.getTropesMap()
      .then(function(tropeInfo){
        var el = $('#details-container');
        el.empty();

        function formatTrope(tropeId) {
          return {
            id: tropeId,
            name: tropeInfo[tropeId].name
          };
        }

        var templateData = {
          id: adjectiveData.id,
          count: adjectiveData.frequency.female + adjectiveData.frequency.male,
          percents: {
            f: adjectiveData.percentage_occurance.female.toFixed(2),
            m: adjectiveData.percentage_occurance.male.toFixed(2)
          },
          tropes: {
            female: _.map(adjectiveData.tropes.female, formatTrope),
            male: _.map(adjectiveData.tropes.male, formatTrope)
          }
        };

        var detailsHtml = adjectiveDetailsTemplate(templateData);
        var sum = adjectiveData.percentage_occurance.female + adjectiveData.percentage_occurance.male;
        var f = (adjectiveData.percentage_occurance.female / sum) * 100;
        var m = (adjectiveData.percentage_occurance.male / sum) * 100;
        var barData = {
          percents: {
            f: f,
            m: m
          }
        };
        var barHtml = splitBarTemplate(barData);

        var pos = $(adjectiveNode).offset();
        var bb = adjectiveNode.getBBox();

        el.append(barHtml);
        el.append(detailsHtml);

        var width = 460;
        var windowWidth = $(window).width();
        if(width > windowWidth) {
          width = windowWidth - 20;
        }
        var height = el.height();
        var left = pos.left;
        var top = pos.top + bb.height + 5;

        var nodeWidth = bb.width;
        if(left + width > windowWidth) {
          left -= (width - nodeWidth);
        }

        if(left < 0) {
          left = 10;
        }


        if(top + height > $(window).height()) {
          top -= (height + bb.height + 10);
        }

        el.css({left: left, top: top, width: width});
        el.show();
      })
      .catch(function(err){
        console.log('error retreiving trope info');
      });

  };

  /**
   * Hide the overlay associated with adjectives.
   */
  GenderSplitVis.prototype.hideAdjectiveDetailOverlay = function(){
    var el = $('#details-container');
    el.hide();
  };

  return GenderSplitVis;

});
