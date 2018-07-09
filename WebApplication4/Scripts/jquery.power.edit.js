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
            onhover: true,     //悬浮显示编辑按钮
            columns: [
                // column对象
            ],
            callback: function (entity) { }
        };
        options = $.extend({}, defaluts, options);

        var poweredit = function (pe, column, options) {
            this.options = $.extend({}, poweredit.defaults, options);
            this.column = $.extend({}, poweredit.column, column);

            if (!this.column.name)
                throw 'input\'s name is required!';
            if (!this.column.type)
                throw 'input\'s type is required!';

            this.$form = $(pe);
            this.$elm = this.$form.find('input[name=' + column.name + ']');

            if (!this.$elm)
                throw 'not found column ' + this.column.name;
            if (this.$elm.length > 1)
                throw 'found columns more than one :' + this.column.name;

            this.entity = $.extend({}, poweredit.entity, {
                key: this.column.name + this.motheds.newGuid(),
                text: this.$elm.data('text'),
                value: this.$elm.val()
            });

            this.init();
        };
        poweredit.defaults = defaluts;
        poweredit.Ctls = {
            text: 'text',
            date: 'date',
            number: 'number',
            password: 'password',
            textarea: 'textarea',
            checkbox: 'checkbox',
            checkboxlist: 'checkboxlist',
            radiobuttonlist: 'radiobuttonlist',
            dropdownlist: 'dropdownlist',

            //easyui
            combo: 'combo',
            combobox: 'combobox',
            combotree: 'combotree',
            numberbox: 'numberbox',
            datebox: 'datebox',
            datetimebox: 'datetimebox',

            //customs
            powerSelection: 'powerSelection'
        },
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
                this.$editit = $('<a/>', { title: '编辑' }).addClass('oper').append($('<i/>').addClass('fa fa-edit fa-fw'));
                this.$submit = $('<a/>', { title: '提交' }).addClass('oper').append($('<i/>').addClass('fa fa-check fa-fw'));
                this.$cancel = $('<a/>', { title: '取消' }).append($('<i/>').addClass('fa fa-undo fa-fw'));

                this.$elm.removeAttr('data-text');
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

                    if (this.options.onhover) {
                        this.$target.parent().on('mouseenter', '.poweredit', $.proxy(self.events.mouseenter, self));
                        this.$target.parent().on('mouseleave', '.poweredit', $.proxy(self.events.mouseleave, self));
                    }
                }
            },
            loaded: function () {
                var self = this;

                if (self.options.onhover) {
                    self.$editit.hide();
                }
                if (self.column.type === poweredit.Ctls.textarea) {
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
                self.$target.addClass('editting');

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

                var $input = self.$target.find('#' + self.entity.key + ', [name=' + self.entity.key + '], .textbox'),
                    $label = self.$target.find('label[for]');
                $input.length && $input.remove();
                $label.length && $label.remove();

                self.$label.show();
                self.$editit.show();
                self.$submit.hide();
                self.$cancel.hide();
                self.$target.removeClass('editting');
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
                    case poweredit.Ctls.text:
                    case poweredit.Ctls.date:
                    case poweredit.Ctls.number:
                    case poweredit.Ctls.password: {
                        $input = $('<input/>', { type: self.column.type, id: self.entity.key, name: self.entity.key });
                        $input.val(self.entity.value);
                    } break;

                    case poweredit.Ctls.textarea: {
                        $input = $('<textarea/>', { type: self.column.type, id: self.entity.key, name: self.entity.key, row: 8 }).css({ 'width': '90%', 'min-height': '80px' });
                        $input.text(self.entity.value);
                    } break;

                    case poweredit.Ctls.checkbox: {
                        $label = $('<label>', { 'for': self.entity.key }).text(self.column.label);
                        $input = $('<input/>', { type: self.column.type, id: self.entity.key, name: self.entity.key });

                        if (typeof self.entity.value === 'string') {
                            var value = self.entity.value.toLowerCase();
                            $input.attr("checked", value == 'true' || value == 'checked');
                        } else if (typeof self.entity.value === 'boolean') {
                            $input.attr("checked", self.entity.value);
                        }
                    } break;

                    case poweredit.Ctls.checkboxlist: {
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
                            var opts = $.extend({}, self.column.options);
                            $.post(self.column.url, opts, rendercore);
                        } else {
                            throw 'invaildate checkboxlist data'
                        }
                    } break;

                    case poweredit.Ctls.radiobuttonlist: {
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
                            var opts = $.extend({}, self.column.options);
                            $.post(self.column.url, opts, rendercore);
                        } else {
                            throw 'invaildate radiobuttonlist data'
                        }
                    } break;

                    case poweredit.Ctls.dropdownlist: {
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
                            var opts = $.extend({}, self.column.options);
                            $.post(self.column.url, opts, rendercore);
                        } else {
                            throw 'invaildate dropdownlist data'
                        }
                    } return;

                    case poweredit.Ctls.powerSelection: {
                        $label = $('<label>', { 'for': self.entity.key }).text(self.entity.text);
                        $input = $('<input/>', { type: 'hidden', id: self.entity.key, name: self.entity.key }).val(self.entity.value);

                        if (typeof self.column.options === 'undefined') {
                            throw new Error("选择插件的规则必须定义options参数！");
                        }

                        var pluginName = "select" + self.column.options.name,
                            requireName = self.column.options.name + "Selection";

                        require([requireName], function () {
                            var pluginOpts = $.extend(self.column.options, {
                                init: function () {
                                    var ids = self.entity.value.split(","),
                                        names = self.entity.text.split(",");
                                    if (ids.length) {
                                        for (var i = 0; i < ids.length; i++) {
                                            this.onAddObject(ids[i], names[i]);
                                        }
                                    }
                                },
                                success: function (names, values) {
                                    $input.val(values);
                                    $label.text(names);
                                },
                                hide: function () {
                                    self.$cancel.click();
                                }
                            });
                            if (pluginName === "selectUsersProvider") {
                                $.selectUsersProvider(pluginOpts);
                            } else {
                                $.power[pluginName](pluginOpts);
                            }
                        });
                    } break;
                    case poweredit.Ctls.combo:
                    case poweredit.Ctls.combobox:
                    case poweredit.Ctls.combotree:
                    case poweredit.Ctls.datebox:
                    case poweredit.Ctls.datetimebox: {
                        $input = $('<input/>', { type: 'text', id: self.entity.key, name: self.entity.key }).val(self.entity.value);

                        require(['easyui'], function () {
                            var opts = $.extend({}, { editable: false }, self.column.options); //默认不允许手工编辑
                            $input[self.column.type](opts);
                            $input[self.column.type]("showPanel");
                        });
                    } break;
                    case poweredit.Ctls.numberbox: {
                        $input = $('<input/>', { type: 'text', id: self.entity.key, name: self.entity.key }).val(self.entity.value);

                        require(['easyui'], function () {
                            var opts = $.extend({}, { precision: 0 }, self.column.options);
                            $input[self.column.type](opts);
                        });
                    } break;

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
                    case poweredit.Ctls.text:
                    case poweredit.Ctls.date:
                    case poweredit.Ctls.number:
                    case poweredit.Ctls.textarea:
                    case poweredit.Ctls.password: {
                        entity.value = $input.val();
                    } break;
                    case poweredit.Ctls.checkbox: {
                        entity.value = $input.is(':checked');
                        entity.text = entity.value ? $input.next().text() : '';
                    } break;
                    case poweredit.Ctls.checkboxlist: {
                        entity.value = []; entity.text = [];
                        $.each($input, function (i, e) {
                            if ($(e).is(':checked')) {
                                entity.value.push($(e).val());
                                entity.text.push($(e).next().text());
                            }
                        });
                    } break;
                    case poweredit.Ctls.radiobuttonlist: {
                        $.each($input, function (i, e) {
                            if ($(e).is(':checked')) {
                                entity.value = $(e).val();
                                entity.text = $(e).next().text();
                            }
                        });
                    } break;
                    case poweredit.Ctls.dropdownlist: {
                        var selected = $input.find('option:selected')
                        entity.value = selected.val();
                        entity.text = selected.text();
                    } break;
                    case poweredit.Ctls.powerSelection: {
                        entity.value = $input.val();
                        entity.text = entity.value ? $input.next().text() : '';
                    } break;
                    case poweredit.Ctls.combo:
                    case poweredit.Ctls.combobox:
                    case poweredit.Ctls.combotree:
                    case poweredit.Ctls.datebox:
                    case poweredit.Ctls.datetimebox: {
                        $input = self.$target.find('#' + self.entity.key);

                        var opts = $.extend({}, self.column.options);
                        entity.value = $input[self.column.type](opts.multiple ? "getValues" : "getValue");
                        entity.text = $input[self.column.type]("getText");
                    } break;
                    case poweredit.Ctls.numberbox: {
                        $input = self.$target.find('#' + self.entity.key);

                        entity.value = $input[self.column.type]("getValue");
                        entity.text = entity.value;
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
                },
                mouseenter: function (e) {
                    var self = this;
                    if (!self.options.onhover) return;
                    if (self.$target.hasClass('editting')) return;

                    self.$editit.show();
                },
                mouseleave: function (e) {
                    var self = this;
                    if (!self.options.onhover) return;
                    if (self.$target.hasClass('editting')) return;

                    self.$editit.hide();
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