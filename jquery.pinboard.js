/*!
 * jQuery Pinboard plugin v1.0.0
 * https://github.com/pinkhominid/pinboard
 *
 * Copyright 2013 Pink Hominid
 * Released under the MIT license
 */
(function($){
    var defaults = {
        breaks: [],
        columnMinHeight: 100,
        sortable: true,
        hiding: false,
        sortHandle: '.pinboard-item-header',
        sortUpdate: undefined
    };

    $.fn.extend({
        pinboard: function (options, value) {
            if (typeof options == 'string')
                switch (options) {
                    case 'destroy':
                        this.each(destroy);
                        break;
                    case 'resize':
                        this.each(resize);
                        break;
                    case 'setItems':
                        this.each(function () {
                            setItems.call(this, value)
                        });
                        break;
                    case 'toggleHidden':
                        this.each(toggleHidden);
                        break;
                    case 'toggleSorting':
                        this.each(toggleSorting);
                        break;
                }
            else
                init.call(this, options);
            return this;
        }
    });

    function init(options) {
        this.each(function () {
            var data, $el, items, i, $cols, $col;

            if (!getData(this)) {
                data = $.extend({}, defaults, options);
                $el = data.$el = $(this)
                    .data('pinboard', data)
                    .addClass('pinboard-container');
                $cols = $();
                items = data.items || $el.children();

                for (i = 0; i < data.breaks.length + 1; i++) {
                    $col = $('<div/>')
                        .addClass('pinboard-column pinboard-column-' + (i + 1))
                        .css({
                            minHeight: data.columnMinHeight,
                            float: 'left'
                        })
                        .appendTo($el);
                    $cols = $cols.add($col);
                }

                if (isSortable(data)) {
                    $el.addClass('pinboard-sortable');
                    $cols.sortable({
                        connectWith: $cols,
                        handle: data.sortHandle,
                        placeholder: 'pinboard-placeholder',
                        forcePlaceholderSize: true,
                        update: sortUpdated,
                        stop: sortStopped
                    });
                }

                data.$cols = $cols;
                $el.append('<div class="pinboard-clearfix" style="clear:both"/>');
                toggleColumns(data);
                setItems.call(this, items);

                $el.on('click', '.pinboard-item-hide-btn, .pinboard-item-show-btn', itemToggle);
            }
        });
    }

    function destroy() {
        if (getData(this)) {
            $(this)
                .empty()
                .removeClass('pinboard-container')
                .removeData('pinboard');
        }
    }
    function resize() {
        var data = getData(this);
        if (data && toggleColumns(data)) arrangeItems(data);
    }
    function setItems(rawItems) {
        var data = getData(this);
        if (data) {
            var i, $item, $header, $hide, $show, pinItems = [];
            rawItems = $(rawItems);
            for (i = 0; i < rawItems.length; i++) {
                $item = rawItems.eq(i);
                pinItems.push($item[0]);

                if ($item.is('br')) {
                    $item.remove();
                } else {
                    $hide = $('<div class="pinboard-item-action pinboard-item-hide-btn">x</div>');
                    $show = $('<div class="pinboard-item-action pinboard-item-show-btn">+</div>');
                    $hide.add($show).css({
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        display: 'none'
                    });
                    $header = $('<div class="pinboard-item-header"/>')
                        .css('position', 'relative')
                        .append(
                            $('<div class="pinboard-item-title">&nbsp;</div>')
                                .text($item.attr('title'))
                        )
                        .append($hide)
                        .append($show);
                    $item
                        .removeAttr('title')
                        .wrap('<div class="pinboard-item"/>')
                        .before($header);
                    if ($item.css('display') == 'none' || $item.attr('hidden') == 'true') {
                        $item
                            .css('display', 'none')
                            .attr('hidden', 'true')
                            .parent()
                                .hide()
                                .addClass('pinboard-item-hidden');
                        if (data.hiding) $show.show();
                    } else {
                        $item.css('display', 'block');
                        if (data.hiding) $hide.show();
                    }
                }
            }
            data.items = pinItems;
            arrangeItems(data);
        }
    }
    function toggleHidden() {
        var data = getData(this);
        if (data && data.hiding) {
            $('.pinboard-item-hidden', data.$el)
                .toggle()
                .find('> :not(.pinboard-item-header)')
                    .toggle();
            data._showHidden = !data._showHidden;
        }
    }
    function toggleSorting() {
        var data = getData(this);
        if (data && $.fn.sortable) {
            data.$el.toggleClass('pinboard-sortable');
            data.$cols.filter(':visible').sortable('option', 'disabled', data.sortable);
            data.sortable = !data.sortable;
        }
    }

    function sortUpdated(event, ui) {
        getData(this)._isDirty = true;
    }
    function sortStopped(event, ui) {
        var data = getData(this), origSort, newSort, i, $visibleCols;

        if (data._isDirty) {
            data._isDirty = false;
            origSort = data.items;
            newSort = [];
            $visibleCols = data.$cols.filter(':visible');

            for (i = 1; i <= getLargestChildrenCount($visibleCols); i++) {
                $visibleCols.each(function () {
                    newSort.push($('.pinboard-item:nth-child(' + i + ') > :not(.pinboard-item-header)', this)[0] || $('<br/>')[0]);
                });
            }
            data.items = newSort;
            normalizeColumnHeights(data);

            if (data.sortUpdate) data.sortUpdate({ origSort: origSort, newSort: newSort });
        }
    }

    function itemToggle() {
        var data = getData(this),
            $pinItem = $(this).closest('.pinboard-item').toggleClass('pinboard-item-hidden'),
            $item = $('> :not(.pinboard-item-header)', $pinItem);

        $('.pinboard-item-hide-btn, .pinboard-item-show-btn', $pinItem).toggle();
        $item.attr('data-hidden', !!$item.attr('data-hidden'));
        if (!data._showHidden) $item.add($pinItem).toggle();
    }
    function getData(el) {
        return $(el).closest('.pinboard-container').data('pinboard');
    }
    function isSortable(data) {
        return data.sortable && $.fn.sortable;
    }
    function toggleColumns(data) {
        var $cols = data.$cols,
            origNumColsVis = $cols.filter(':visible').length,
            numColsVis = 0, i;

        $cols.hide().eq(0).show();
        numColsVis++;

        if (isSortable(data)) $cols.sortable('disable').eq(0).sortable('enable');

        for (i = 0; i < data.breaks.length; i++) {
            if (data.$el.width() >= data.breaks[i]) {
                $cols.eq(i+1).show();
                numColsVis++;
                if (isSortable(data)) $cols.eq(i+1).sortable('enable');
            }
        }

        $cols.css('width', 100 / numColsVis + '%');
        return origNumColsVis !== numColsVis;
    }
    function arrangeItems(data) {
        var $visibleCols = data.$cols.empty().filter(':visible'), i;

        for (i = 0; i < data.items.length; i++) {
            if (data.items[i])
                $visibleCols.eq(i % $visibleCols.length).append($(data.items[i]).parent());
        }

        normalizeColumnHeights(data);
    }
    function normalizeColumnHeights(data) {
        data.$cols
            .css('minHeight', 'auto')
            .css('minHeight', Math.max(data.columnMinHeight, getTallest(data.$cols)));
    }
    function getLargestChildrenCount($els) {
        var vals = [];
        $els.each(function () {
            vals.push($(this).children().length);
        });
        return Math.max.apply(null, vals);
    }
    function getTallest($els) {
        var vals = [];
        $els.each(function () {
            vals.push($(this).height());
        });
        return Math.max.apply(null, vals);
    }
})(jQuery);
