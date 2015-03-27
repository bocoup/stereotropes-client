define(function(require, exports, module) {
  'use strict';

  var Backbone = require('backbone');
  var $ = require('jquery');
  var Router = require('./core/router');

  new Router();
  var openLinkInTab = false;

  Backbone.history.start({
    pushState: true,
    root: "/"
  });

  // making sure we can still open new tabs with backbone routes:
  // https://gist.github.com/michaelkoper/9402728

  $(document).keydown(function(event) {
    if (event.ctrlKey || event.keyCode === 91) {
      openLinkInTab = true;
    }
  });

  $(document).keyup(function(event) {
    openLinkInTab = false;
  });

  // Use delegation to avoid initial DOM selection and allow all matching elements to bubble
  $(document).delegate("a", "click", function(evt) {
    // Get the anchor href and protcol
    var href = $(this).attr("href");
    var protocol = this.protocol + "//";

    // Ensure the protocol is not part of URL, meaning its relative.
    // Stop the event bubbling to ensure the link will not cause a page refresh.
    if (!openLinkInTab && href.slice(protocol.length) !== protocol) {
      evt.preventDefault();

      // Note by using Backbone.history.navigate, router events will not be
      // triggered.  If this is a problem, change this to navigate on your
      // router.
      Backbone.history.navigate(href, true);
    }
  });
});
