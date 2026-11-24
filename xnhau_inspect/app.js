
$(document).ready(function () {

  $('body').on("click", function (event) {
    if (!$(event.target).closest('.button, .primary').length) {
      if ($(".navigation").hasClass("open")) {
        $(".navigation").removeClass("open");
      }
    }
  });


  $("body").on('click', ".sort", function (e) {
    if (!$(e.target).closest(".sort").hasClass("open-sort")) {
      $(".sort").removeClass("open-sort");
      $(e.target).closest(".sort").addClass("open-sort");
    } else {
      $(".sort").removeClass("open-sort");
    }
  });

  $('body').on("click", function (event) {
    if (!$(event.target).closest('.sort, strong, .drop').length) {
      if ($(".sort").hasClass("open-sort")) {
        $(".sort").removeClass("open-sort");
      }
    }
  });

  // select();
  favorites();
});

function favorites() {
  $(".drop").on('click', function () {
    var $this = $(this).parent('.btn-favourites');
    $this.hasClass("open-drop") ? $this.removeClass("open-drop") : $this.addClass("open-drop");
  });
  $('body').on("click", function (event) {
    if (!$(event.target).closest('.drop, .btn-favourites ul').length) {
      if ($(".btn-favourites").hasClass("open-drop")) {
        $(".btn-favourites").removeClass("open-drop");
      }
    }
  });
}

function select() {
  var $select = $('.selectbox');
  if (!$select.length) return false;

  $select.find('option').each(function () {
    var _tmp = $('<span/>', {
      html: this.innerHTML
    }).css({
      position: 'absolute',
      top: -9999,
      left: -9999
    }).appendTo('body');
    console.log(_tmp);
    var width = _tmp.width();
    var maxWidth = $select.width();
    while (_tmp.width() > maxWidth) {
      _tmp.text(function (index, text) {
        return text.replace(/\W*\s(\S)*$/, '...');
      });
    }
    this.innerHTML = _tmp.text();
    _tmp.remove();
  });
}