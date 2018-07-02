/*********************
 * 在线单项编辑插件 *
**********************/
;
(function () {
    $.fn.poweredit = function (options) {
        var applicationPath = window.applicationPath === "" ? "" : window.applicationPath || "../..";
        var defaluts = {
            url: '',            //Posturl
            params: {},         //参数集合
            enable: true,       //全局开关
            columns: [
                // column对象
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
            enable: true,
            minLength: null,
            maxLength: null,
            min: null,
            max: null,
            url: '',        // Url数据源
            data: null,     // Data数据源
            options: {},    // 插件渲染所需参数
            renderit: null, // function () { //添加编辑插件（可放回$input， 可直接加入） };
            getvalue: null, // function () { return { text: '', value: '' }; }
            validate: null  // function (entity) { return true; }
        };
        poweredit.entity = {
            key: '',
            text: '',
            value: null
        };
        poweredit.prototype = {
            init: function () {
                this.create.call(this);
                this.loaded.call(this);
            },
            create: function () {
                var self = this;
                var name = this.column.name, value = this.entity.value, text = this.entity.text;
                this.$target = $('<div/>').addClass('poweredit');
                this.$label = $('<span/>').text(text ? text : value);
                this.$editit = $('<a/>', { title: '编辑' }).addClass('edit').append($('<i/>').addClass('fa fa-edit fa-fw'));
                this.$submit = $('<a/>', { title: '提交' }).addClass('edit').append($('<i/>').addClass('fa fa-check fa-fw'));
                this.$cancel = $('<a/>', { title: '取消' }).append($('<i/>').addClass('fa fa-undo fa-fw'));

                this.$elm.attr('type', 'hidden').val(value);
                this.$elm.parent().find('.poweredit').remove();
                this.$elm.after(this.$target.append(this.$label));

                if (this.options.enable && this.column.enable) {
                    this.$target.append(this.$editit).append(this.$submit).append(this.$cancel);

                    this.$editit.unbind("click").click($.proxy(self.editit, self));
                    this.$submit.unbind("click").click($.proxy(self.submit, self)).hide();
                    this.$cancel.unbind("click").click($.proxy(self.cancel, self)).hide();
                    this.$target.on('keydown', 'input[type=text]', $.proxy(self.events.keydown, self));
                    this.$target.on('keyup', 'input[type=text], textarea', $.proxy(self.events.keyup, self));
                }
            },
            loaded: function () {
                var self = this;

                if (self.column.type === 'textarea') {
                    var value = self.$label.text();
                    self.entity.value = value;
                    self.$label.addClass('multi-line').html(value ? value.replace(/\n/g, '<br/>') : '');
                }
            },
            editit: function () {
                var self = this;

                self.$label.hide();
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
                        self.motheds.notice(data.error);
                        return;
                    }

                    self.entity = $.extend({}, self.entity, entity);
                    self.display.call(self, true);
                    typeof self.options.callback == 'function' && self.options.callback(self.entity);
                });
            },
            display: function (ok) {
                var self = this;

                if (ok) {
                    self.$elm.val(self.entity.value);
                    self.$label.text(self.entity.text ? self.entity.text : self.entity.value);

                    self.loaded.call(self);
                }

                var $input = self.$target.find('[name=' + self.entity.key + ']'),
                    $label = self.$target.find('label[for]');
                $input.length && $input.remove();
                $label.length && $label.remove();

                self.$label.show();
                self.$editit.show();
                self.$submit.hide();
                self.$cancel.hide();
            },

            renderit: function () {
                var self = this;
                var $input, $label;
                var applyit = function () {
                    if (self.column.width) {
                        $input.css({ 'width': self.column.width });
                    }
                    if (self.column.height) {
                        $input.css({ 'height': self.column.height });
                    }
                    if (self.column.css) {
                        $input.css(self.column.css);
                    }
                    if (self.column.class) {
                        $input.addClass(self.column.class);
                    }
                    if (self.column.placeholder) {
                        $input.attr('placeholder', self.column.placeholder);
                    }

                    self.$editit.after($input);
                    $input.focus();
                    $label && $input.after($label);
                }

                switch (self.column.type) {
                    case 'text':
                    case 'date':
                    case 'password': {
                        $input = $('<input/>', { type: self.column.type, id: self.entity.key, name: self.entity.key });
                        $input.val(self.entity.value);
                    } break;

                    case 'textarea': {
                        $input = $('<textarea/>', { type: self.column.type, id: self.entity.key, name: self.entity.key, row: 8 }).css({ 'width': '90%', 'min-height': '80px' });
                        $input.text(self.entity.value);
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
                        var rendercore = function (data) {
                            self.column.data = data;
                            for (var i = 0; i < data.length; i++) {
                                var id = self.entity.key + '-' + i, item = data[i];
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
                        }

                        if (typeof self.entity.value == 'string') {
                            selected = self.entity.value.split(',');
                        } else if (typeof self.entity.value == 'object') {
                            selected = self.entity.value;
                        }

                        if (self.column.data) {
                            rendercore(self.column.data);
                        } else if (self.column.url) {
                            $.post(self.column.url, self.column.options, rendercore);
                        } else {
                            throw 'invaildate checkboxlist data'
                        }
                    } break;

                    case 'radiobuttonlist': {
                        var array = [];
                        var rendercore = function (data) {
                            self.column.data = data;
                            for (var i = 0; i < data.length; i++) {
                                var id = self.entity.key + '-' + i, item = data[i];
                                var _$label = $('<label>', { 'for': id }).text(item.text),
                                    _$input = $('<input/>', { type: 'radio', id: id, name: self.entity.key }).val(item.value);
                                if (self.entity.value == item.value) {
                                    _$input.attr('checked', true);
                                }
                                array.push(_$input);
                                array.push(_$label);
                            }
                            self.$editit.after(array);
                        }

                        if (self.column.data) {
                            rendercore(self.column.data);
                        } else if (self.column.url) {
                            $.post(self.column.url, self.column.options, rendercore);
                        } else {
                            throw 'invaildate radiobuttonlist data'
                        }
                    } break;

                    case 'dropdownlist': {
                        $input = $('<select />', { id: self.entity.key, name: self.entity.key });
                        var selected = [];
                        var rendercore = function (data) {
                            self.column.data = data;
                            for (var i = 0; i < data.length; i++) {
                                var id = self.entity.key + '-' + i, item = data[i];
                                var $option = $('<option />', { value: item.value }).text(item.text);
                                var checked = $.grep(selected, function (e, i) { return e == item.value });
                                if (checked.length) {
                                    $option.attr('selected', true);
                                }
                                $input.append($option);
                            }

                            $input && applyit();
                        }

                        if (typeof self.entity.value == 'string') {
                            selected = self.entity.value.split(',');
                        } else if (typeof self.entity.value == 'object') {
                            selected = self.entity.value;
                        }

                        if (self.column.data) {
                            rendercore(self.column.data);
                        } else if (self.column.url) {
                            $.post(self.column.url, self.column.options, rendercore);
                        } else {
                            throw 'invaildate dropdownlist data'
                        }
                    } return;

                    default: {
                        if (typeof self.column.renderit === 'function') {
                            $input = self.column.renderit.call(self);
                        } else {
                            throw 'not supperted type:' + self.column.type;
                        }
                    } break;
                }

                $input && applyit();
            },
            getvalue: function () {
                var self = this;
                var $input = self.$target.find('[name=' + self.entity.key + ']');
                var entity = {
                    name: self.column.name,
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
                    case 'textarea': {
                        entity.value = $input.text();
                    } break;
                    case 'checkbox': {
                        entity.value = $input.is(':checked');
                        entity.text = entity.value ? $input.next().text() : '';
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
                    default: {
                        if (typeof self.column.getvalue === 'function') {
                            var data = self.column.getvalue.call(self);
                            if (!data) {
                                entity.value = entity.text = '';
                            } else if (typeof data === 'string') {
                                entity.value = entity.text = data;
                            } else {
                                entity.value = data.value;
                                entity.text = data.text;
                            }
                        } else {
                            throw 'not supperted type:' + self.column.type;
                        }
                    } break;
                }
                return entity;
            },
            validate: function (entity) {
                var self = this;

                if (typeof self.column.minLength == 'number') {
                    if (!entity.value || entity.value.length < self.column.minLength) {
                        self.motheds.notice('输入内容长度少于' + self.column.minLength);
                        return false;
                    }
                }
                if (typeof self.column.maxLength == 'number') {
                    if (entity.value && entity.value.length > self.column.maxLength) {
                        self.motheds.notice('输入内容长度大于' + self.column.maxLength);
                        return false;
                    }
                }
                if (typeof self.column.min == 'number') {
                    if (Number(entity.value) != NaN && Number(entity.value) < self.column.min) {
                        self.motheds.notice('输入数字小于' + self.column.min);
                        return false;
                    }
                }
                if (typeof self.column.max == 'number') {
                    if (Number(entity.value) != NaN && Number(entity.value) > self.column.max) {
                        self.motheds.notice('输入数字大于' + self.column.max);
                        return false;
                    }
                }
                if (typeof self.column.validate === 'function') {
                    return self.column.validate.call(self, entity);
                }
                return true;
            },

            events: {
                keyup: function (e) {
                    if (e.keyCode !== 27) return;
                    var self = this;

                    self.$cancel.click();
                },
                keydown: function (e) {
                    if (e.keyCode !== 13) return;
                    var self = this;

                    self.submit.call(self);
                }
            },

            motheds: {
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