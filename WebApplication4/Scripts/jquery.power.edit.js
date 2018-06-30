/*********************
 * * *
**********************/
;
(function () {
    $.fn.poweredit = function (options) {
        var applicationPath = window.applicationPath === "" ? "" : window.applicationPath || "../..";
        var poweredit = function (elm, options) {
            this.$elm = $(elm);
            this.options = $.extend({}, poweredit.defaults, options);
            this.entity = $.extend({}, poweredit.entity, {
                type: this.$elm.data('type'),
                name: this.$elm.attr('name'),
                text: this.$elm.attr('text'),
                value: this.$elm.val()
            });
            if (this.$elm.data('options')) {
                console.log('{ ' + this.$elm.data('options') + ' }');
                this.rule = $.extend({}, poweredit.rule, JSON.parse('{ ' + this.$elm.data('options') + ' }'));
            }

            if (!this.entity.name)
                throw 'input\'s name is required!';
            if (!this.entity.type)
                throw 'input\'s type is required!';

            this.init();
        };
        poweredit.rule = {
            minLength: null,
            maxLength: null,
            min: null,
            max: null,
            options: {}, //{}
            validate: null // function (value) { return true; }
        };
        poweredit.entity = {
            key: '',
            name: '',
            type: '',
            text: '',
            value: null,
        };
        poweredit.defaults = {
            url: '',            //列表的url
            params: {},            //参数集合
            callback: function (entity) { }
        };
        poweredit.prototype = {
            init: function () {
                var self = this;
                var name = this.entity.name, value = this.entity.value, text = this.entity.text;
                var $lable = $('<span/>', { name: 'it' }).data('value', value).text(text ? text : value),
                    $editit = $('<a/>', { name: 'editit' }).append($('<i/>').addClass('fa fa-edit fa-fw')),
                    $submit = $('<a/>', { name: 'submit' }).append($('<i/>').addClass('fa fa-save fa-fw')),
                    $cancel = $('<a/>', { name: 'cancel' }).append($('<i/>').addClass('fa fa-remove fa-fw'));

                this.$elm.attr('type', 'hidden');
                this.$elm.parent().find('span[name], a').remove();
                this.$elm.before($lable);
                this.$elm.parent().append($editit).append($submit).append($cancel);

                $editit.unbind("click").click($.proxy(self.editit, self));
                $submit.unbind("click").click($.proxy(self.submit, self)).hide();
                $cancel.unbind("click").click($.proxy(self.cancel, self)).hide();
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
                var $lable = self.$elm.prev('span[name]'),
                    $editit = self.$elm.parent().find('a[name=editit]'),
                    $submit = self.$elm.parent().find('a[name=submit]'),
                    $cancel = self.$elm.parent().find('a[name=cancel]');

                $lable.hide(); $editit.hide();
                $submit.show(); $cancel.show();

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
                var $lable = self.$elm.prev('span[name]'),
                    $editit = self.$elm.parent().find('a[name=editit]'),
                    $submit = self.$elm.parent().find('a[name=submit]'),
                    $cancel = self.$elm.parent().find('a[name=cancel]');

                if (ok) {
                    $lable.data('value', self.entity.value)
                        .text(self.entity.text ? self.entity.text : self.entity.value);
                } else {
                    self.entity.value = $lable.data('value');
                    self.entity.text = $lable.text();
                }

                if (self.entity.key) {
                    var $input = self.$elm.parent().find('#' + self.entity.key);
                    if ($input.length) $input.remove();
                    self.entity.key = '';
                }
                $lable.show(); $editit.show();
                $submit.hide(); $cancel.hide();
            },

            renderit: function () {
                var self = this;
                var $input, $editit = self.$elm.parent().find('a[name=editit]');
                self.entity.key = self.entity.name + Math.random() * Math.pow(10, 17);

                switch (self.entity.type) {
                    case 'text': {
                        $input = $('<input/>', { type: self.entity.type, id: self.entity.key, name: self.entity.key });
                        $input.val(self.entity.value);
                    } break;
                    case 'textarea': {
                        $input = $('<textarea/>', { type: self.entity.type, id: self.entity.key, name: self.entity.key, row: 8 });
                        $input.val(self.entity.value);
                    } break;
                    default:
                        throw 'not supperted type:' + self.entity.type;
                }

                if (self.rule.css) {
                    $input.css(self.rule.css);
                }
                if (self.rule.width) {
                    $input.css({ 'width': self.rule.width });
                }
                if (self.rule.height) {
                    $input.css({ 'height': self.rule.height });
                }
                if (self.rule.class) {
                    $input.addClass(self.rule.class);
                }
                if (self.rule.placeholder) {
                    $input.attr('placeholder', self.rule.placeholder);
                }
                $editit.after($input);
            },
            getvalue: function () {
                var self = this;
                var $input = self.$elm.parent().find('#' + self.entity.key);
                var entity = $.extend({}, poweredit.entity, {
                    name: self.entity.name,
                    type: self.entity.type
                });

                switch (self.entity.type) {
                    case 'text': 
                    case 'textarea': {
                        entity.value = $input.val();
                    } break;
                    default:
                        throw 'not supperted type:' + self.entity.type;
                }
                return entity;
            },
            validate: function (entity) {
                var self = this;

                if (typeof self.rule.validate === 'function') {
                    return self.rule.validate(entity.value);
                }
                if (typeof self.rule.minLength == 'number') {
                    if (!entity.value || entity.value.length < self.rule.minLength) {
                        self.notice('输入内容长度少于' + self.rule.minLength);
                        return false;
                    }
                }
                if (typeof self.rule.maxLength == 'number') {
                    if (entity.value && entity.value.length > self.rule.maxLength) {
                        self.notice('输入内容长度大于' + self.rule.maxLength);
                        return false;
                    }
                }
                if (typeof self.rule.min == 'number') {
                    if (Number(entity.value) != NaN && Number(entity.value) < self.rule.min) {
                        self.notice('输入数字小于' + self.rule.min);
                        return false;
                    }
                }
                if (typeof self.rule.max == 'number') {
                    if (Number(entity.value) != NaN && Number(entity.value) > self.rule.max) {
                        self.notice('输入数字大于' + self.rule.max);
                        return false;
                    }
                }
                return true;
            }
        };

        $.each(this, function (i, el) {
            new poweredit(el, options);
        });
        return this;
    };
})(jQuery);