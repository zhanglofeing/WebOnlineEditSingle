/*********************
 * 在线单项编辑插件 *
**********************/
;
(function () {
    $.fn.poweredit = function (options) {
        var applicationPath = window.applicationPath === "" ? "" : window.applicationPath || "../..";
        var defaluts = {
            url: '',            //列表的url
            params: {},            //参数集合
            columns: [
                //{ name: '', type: '' }
            ],
            callback: function (entity) { }
        };
        options = $.extend({}, defaluts, options);

        var poweredit = function (_, column, options) {
            this.options = $.extend({}, poweredit.defaults, options);
            this.column = $.extend({}, poweredit.column, column);

            if (!this.column.name)
                throw 'input\'s name is required!';
            if (!this.column.type)
                throw 'input\'s type is required!';

            this.$form = $(_);
            this.$elm = this.$form.find('input[name=' + column.name + ']');

            if (!this.$elm)
                throw 'unfound column ' + this.column.name;

            this.entity = $.extend({}, poweredit.entity, {
                key: this.column.name + this.motheds.newGuid(),
                text: this.$elm.data('text'),
                value: this.$elm.val()
            });

            this.init();
        };
        poweredit.defaults = defaluts;
        poweredit.column = {
            name: '',
            type: '',
            minLength: null,
            maxLength: null,
            min: null,
            max: null,
            options: {}, //{}
            validate: null // function (value) { return true; }
        };
        poweredit.entity = {
            key: '',
            text: '',
            value: null,
        };
        poweredit.prototype = {
            init: function () {
                var self = this;
                var name = this.column.name, value = this.entity.value, text = this.entity.text;
                this.$lable = $('<span/>', { name: 'it' }).data('value', value).text(text ? text : value);
                this.$editit = $('<a/>', { name: 'editit' }).append($('<i/>').addClass('fa fa-edit fa-fw'));
                this.$submit = $('<a/>', { name: 'submit' }).append($('<i/>').addClass('fa fa-save fa-fw'));
                this.$cancel = $('<a/>', { name: 'cancel' }).append($('<i/>').addClass('fa fa-remove fa-fw'));

                this.$elm.attr('type', 'hidden');
                this.$elm.parent().find('span[name], a').remove();
                this.$elm.before(this.$lable);
                this.$elm.parent().append(this.$editit).append(this.$submit).append(this.$cancel);

                this.$editit.unbind("click").click($.proxy(self.editit, self));
                this.$submit.unbind("click").click($.proxy(self.submit, self)).hide();
                this.$cancel.unbind("click").click($.proxy(self.cancel, self)).hide();
            },
            notice: function (msg) {
                var self = this;
                if ($.power && $.power.tip) {
                    $.power.tip(msg, 'warning');
                    return;
                } else if ($.jBox) {
                    $.jBox.tip(msg, 'warning');
                    return;
                } else {
                    alert(msg);
                }
            },
            editit: function () {
                var self = this;

                self.$lable.hide();
                self.$editit.hide();
                self.$submit.show();
                self.$cancel.show();

                self.renderit.call(self);
            },
            cancel: function () {
                var self = this;

                self.display.call(self, false);
            },
            submit: function () {
                var self = this, entity = self.getvalue();
                if (!entity) {
                    throw 'form entity is null';
                }
                if (!self.validate.call(self, entity)) {
                    return;
                }

                var params = $.extend({}, self.options.params, entity);
                $.post(self.options.url, params, function (data) {
                    if (data.error) {
                        this.notice(data.error);
                        return;
                    }

                    self.entity.text = entity.text;
                    self.entity.value = entity.value;
                    self.display.call(self, true);
                    typeof self.options.callback == 'function' && self.options.callback(entity);
                });
            },
            display: function (ok) {
                var self = this;

                if (ok) {
                    self.$lable
                        .data('value', self.entity.value)
                        .text(self.entity.text ? self.entity.text : self.entity.value);
                } else {
                    self.entity.text = self.$lable.text();
                    self.entity.value = self.$lable.data('value');
                }

                if (self.entity.key) {
                    var $input = self.$elm.parent().find('[name=' + self.entity.key + ']'),
                        $label = self.$elm.parent().find('label[for]');
                    if ($input.length) $input.remove();
                    if ($label.length) $label.remove();
                }
                self.$lable.show();
                self.$editit.show();
                self.$submit.hide();
                self.$cancel.hide();
            },

            renderit: function () {
                var self = this;
                var $input, $label;

                switch (self.column.type) {
                    case 'text':
                    case 'date':
                    case 'password': {
                        $input = $('<input/>', { type: self.column.type, id: self.entity.key, name: self.entity.key });
                        $input.val(self.entity.value);
                    } break;
                    case 'checkbox': {
                        $label = $('<label>', { 'for': self.entity.key }).text(self.column.label);
                        $input = $('<input/>', { type: self.column.type, id: self.entity.key, name: self.entity.key });

                        if (typeof self.entity.value === 'string') {
                            var value = self.entity.value.toLowerCase();
                            $input.attr("checked", value == 'true' || value == 'checked');
                        } else if (typeof self.entity.value === 'boolean') {
                            $input.attr("checked", self.entity.value);
                        }
                    } break;
                    case 'checkboxlist': {
                        var array = [], selected = [];
                        if (typeof self.entity.value == 'string') {
                            selected = self.entity.value.split(',');
                        } else if (typeof self.entity.value == 'object') {
                            selected = self.entity.value;
                        }
                        for (var i = 0; i < self.column.data.length; i++) {
                            var id = self.entity.key + '-' + i, item = self.column.data[i];
                            var _$label = $('<label>', { 'for': id }).text(item.text),
                                _$input = $('<input/>', { type: 'checkbox', id: id, name: self.entity.key }).val(item.value);
                            var checked = $.grep(selected, function (e, i) { return e == item.value });
                            if (checked.length) {
                                _$input.attr('checked', true);
                            }
                            array.push(_$input);
                            array.push(_$label);
                        }
                        self.$editit.after(array);
                    } break;
                    case 'radiobuttonlist': {
                        var array = [];
                        for (var i = 0; i < self.column.data.length; i++) {
                            var id = self.entity.key + '-' + i, item = self.column.data[i];
                            var _$label = $('<label>', { 'for': id }).text(item.text),
                                _$input = $('<input/>', { type: 'radio', id: id, name: self.entity.key }).val(item.value);
                            if (self.entity.value == item.value) {
                                _$input.attr('checked', true);
                            }
                            array.push(_$input);
                            array.push(_$label);
                        }
                        self.$editit.after(array);
                    } break;
                    case 'dropdownlist': {
                        var selected = [];
                        if (typeof self.entity.value == 'string') {
                            selected = self.entity.value.split(',');
                        } else if (typeof self.entity.value == 'object') {
                            selected = self.entity.value;
                        }
                        $input = $('<select />', { id: self.entity.key, name: self.entity.key });
                        for (var i = 0; i < self.column.data.length; i++) {
                            var id = self.entity.key + '-' + i, item = self.column.data[i];
                            var _$input = $('<option />', { value: item.value }).text(item.text);
                            var checked = $.grep(selected, function (e, i) { return e == item.value });
                            if (checked.length) {
                                _$input.attr('selected', true);
                            }
                            $input.append(_$input);
                        }
                    } break;
                    case 'textarea': {
                        $input = $('<textarea/>', { type: self.column.type, id: self.entity.key, name: self.entity.key, row: 8 });
                        $input.val(self.entity.value);
                    } break;
                    default:
                        throw 'not supperted type:' + self.column.type;
                }

                if (!$input) return;

                if (self.column.css) {
                    $input.css(self.column.css);
                }
                if (self.column.width) {
                    $input.css({ 'width': self.column.width });
                }
                if (self.column.height) {
                    $input.css({ 'height': self.column.height });
                }
                if (self.column.class) {
                    $input.addClass(self.column.class);
                }
                if (self.column.placeholder) {
                    $input.attr('placeholder', self.column.placeholder);
                }

                self.$editit.after($input);
                if ($label) $input.after($label);
            },
            getvalue: function () {
                var self = this;
                var $input = self.$elm.parent().find('[name=' + self.entity.key + ']');
                var entity = {
                    name: poweredit.column.name,
                    value: '',
                    text: ''
                };

                switch (self.column.type) {
                    case 'text':
                    case 'date':
                    case 'textarea':
                    case 'password': {
                        entity.value = $input.val();
                    } break;
                    case 'checkbox': {
                        entity.value = $input.is(':checked');
                    } break;
                    case 'checkboxlist': {
                        entity.value = []; entity.text = [];
                        $.each($input, function (i, e) {
                            if ($(e).is(':checked')) {
                                entity.value.push($(e).val());
                                entity.text.push($(e).next().text());
                            }
                        });
                    } break;
                    case 'radiobuttonlist': {
                        $.each($input, function (i, e) {
                            if ($(e).is(':checked')) {
                                entity.value = $(e).val();
                                entity.text = $(e).next().text();
                            }
                        });
                    } break;
                    case 'dropdownlist': {
                        var selected = $input.find('option:selected')
                        entity.value = selected.val();
                        entity.text = selected.text();
                    } break;
                    default:
                        throw 'not supperted type:' + self.column.type;
                }
                return entity;
            },
            validate: function (entity) {
                var self = this;

                if (typeof self.column.validate === 'function') {
                    return self.column.validate(entity.value);
                }
                if (typeof self.column.minLength == 'number') {
                    if (!entity.value || entity.value.length < self.column.minLength) {
                        self.notice('输入内容长度少于' + self.column.minLength);
                        return false;
                    }
                }
                if (typeof self.column.maxLength == 'number') {
                    if (entity.value && entity.value.length > self.column.maxLength) {
                        self.notice('输入内容长度大于' + self.column.maxLength);
                        return false;
                    }
                }
                if (typeof self.column.min == 'number') {
                    if (Number(entity.value) != NaN && Number(entity.value) < self.column.min) {
                        self.notice('输入数字小于' + self.column.min);
                        return false;
                    }
                }
                if (typeof self.column.max == 'number') {
                    if (Number(entity.value) != NaN && Number(entity.value) > self.column.max) {
                        self.notice('输入数字大于' + self.column.max);
                        return false;
                    }
                }
                return true;
            },

            motheds: {
                newGuid: function () {
                    var guid = "";
                    for (var i = 1; i <= 32; i++) {
                        var n = Math.floor(Math.random() * 16.0).toString(16);
                        guid += n;
                        if ((i == 8) || (i == 12) || (i == 16) || (i == 20))
                            guid += "-";
                    }
                    return guid;
                }
            }
        };

        var self = this;
        $.each(options.columns, function (i, column) {
            new poweredit(self, column, options);
        });
        return this;
    };
})(jQuery);