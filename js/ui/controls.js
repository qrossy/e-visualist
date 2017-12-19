function svgSlider(svg, x, y, id, minValue, maxValue, stepValue, param, entity) {
  var sliderSvg = svg.append("svg:foreignObject")
    .attr("x", x)
    .attr("y", y)
    .attr("width", 20)
    .attr("height", 75);
  var div = $('<div style="margin-left:5px;">');
  div.append('<input type="text" id="' + id + '" size="1"/>');
  div.append('<div class="vslider" id="slider-' + id + '" style="height:25px;" title="' + id + '"></div>');
  $(sliderSvg.node()).append(div);
  $("#slider-" + id).slider({
    orientation: "vertical",
    range: "min",
    min: minValue,
    max: maxValue,
    step: stepValue,
    value: entity[param],
    slide: function(event, ui) {
      if (Interface.modifiedEntity == null) Interface.modifiedEntity = entity.getData();
      $("#" + id).val(ui.value);
      entity[param] = ui.value;
      entity.g.hideHelpers();
      entity.redraw();
    }
  });
  $("#" + id).val($("#slider-" + id).slider("value"));
}
