window.angular = require("angular");
require("angular-mocks");

angular.module("app", []);

class Toggle {
  constructor() {
    this.value = false;
    this.changeCount = 0;
  }

  onChanged() {
    this.changeCount++;
  }
}

angular.module("app")
  .component("toggle", {
    template: `
<div>
    <label for="toggle">
    <input id="toggle"
           ng-change="$ctrl.onChanged()"
           type="checkbox"
           ng-model="$ctrl.value"
    />Toggle value: {{ $ctrl.value }}</label>
    <span id="changeCount">{{ $ctrl.changeCount }}</span>
</div>
        `,
    controller: [
      Toggle
    ]
  });


describe("clicking a checkbox", () => {
  describe(`in an angularjs component`, () => {
    it("should raise changed event", async () => {
      // Arrange
      const sut = await easyMount($compile, $rootScope, "<toggle></toggle>");

      // Act
      sut.$trigger("input[type=checkbox]", "click");

      // Assert
      const checkbox = sut.$find("input[type=checkbox]");
      expect(checkbox.checked)
        .toBe(true);
      const span = sut.$find("#changeCount");
      expect(span.innerHTML.trim())
        .toEqual("1");

    });
  });

  describe(`vanilla DOM`, () => {
    it(`should raise the changed event`, async () => {
      // Arrange
      const
        doc = window.document,
        chk = doc.createElement("input");
      chk.type = "checkbox";
      let clicked = false, changed = false;
      chk.addEventListener("click", () => clicked = true);
      chk.addEventListener("change", () => changed = true);
      doc.body.appendChild(chk);
      // Act
      fireEvent(chk, "click", null);
      // Assert
      expect(clicked)
        .toBe(true);
      expect(changed)
        .toBe(true);
    });
  });

  let $compile, $rootScope;
  beforeEach(angular.mock.module("app"));
  beforeEach(angular.mock.inject(function (
    _$rootScope_,
    _$compile_,
  ) {
    $rootScope = _$rootScope_;
    $compile = _$compile_;
  }));
});

/**
 * @template TController
 * @param {Function} $compile
 * @param {IScope} $scope
 * @param {string} tagOrHtml
 * @param {Condition=} [waitFor=undefined]
 * @returns Promise<TestComponent<TController>>
 */

async function easyMount(
  $compile,
  $scope,
  tagOrHtml,
  waitFor
) {
  if (!tagOrHtml.match(/</)) {
    tagOrHtml = `<${tagOrHtml}></${tagOrHtml}>`;
  }
  const
    el = $compile(tagOrHtml)($scope),
    result = {};
  $scope.$digest();
  const isolateScope = el.isolateScope();
  if (!isolateScope) {
    throw new Error(`Unable to retrieve isolated scope for ${tagOrHtml} -- check that the component exists & the http backend isn't mocked`);
  }
  result.$el = el[0];
  result.$ctrl = isolateScope.$ctrl;
  result.$digest = $scope.$digest.bind($scope);
  result.$apply = $scope.$apply.bind($scope);
  result.$find = selector => {
    return result.$el.querySelector(selector);
  };

  result.$findAll = selector => {
    return Array.from(result.$el.querySelectorAll(selector));
  };

  result.$trigger = function (
    selector,
    eventName,
    data
  ) {
    trigger(this, selector, eventName, data);
    result.$apply();
    result.$digest();
  };

  result.$settle = async function () {
    let html;
    do {
      result.$digest();
      html = result.$el.outerHTML;
      await sleep(50);
    } while (html !== result.$el.outerHTML);
  };


  // caller probably would appreciate an auto-digest cycle
  result.$digest();

  if (typeof waitFor === "function") {
    const start = nowFn();
    let result;
    do {
      result = await waitFor();
      if (!result) {
        await sleep(50);
      }
    } while (nowFn() - start < 1000);
    if (!result) {
      throw new Error(
        `waitFor fn did not resolve truthy value within 1s`
      );
    }
  }

  return result;
}

/**
 *
 * @param {TestComponent} wrapper
 * @param {string|HTMLElement} selector
 * @param {string} eventName
 * @param {*} data
 * @returns {Promise<void>}
 */
function trigger(
  wrapper,
  selector,
  eventName,
  data
) {
  const on = typeof selector === "string"
    ? wrapper.$find(selector)
    : selector;
  if (on instanceof HTMLElement) {
    fireEvent(on, eventName, data);
  } else {
    if (on.$el && on.$el instanceof HTMLElement) {
      fireEvent(on.$el, eventName, data);
    } else if (on.element && on.element instanceof HTMLInputElement) {
      on.trigger(eventName, data);
    } else if (on.element && on.element instanceof HTMLElement) {
      fireEvent(on.element, eventName, data);
    } else {
      on.trigger(eventName, data);
    }
  }
}

/**
 *
 * @param {HTMLElement} node
 * @param {string} eventName
 * @param {*} data
 */
function fireEvent(
  node,
  eventName,
  data
) {
  if (node.dispatchEvent) {
    let ev;
    switch (eventName) {
      case "click":
      case "mousedown":
      case "mouseup":
        ev = new window.MouseEvent(eventName, {
          view: window,
          bubbles: true,
          cancelable: true
        });
        break;
      case "keydown":
      case "keyup":
      case "keypressed":
        ev = new KeyboardEvent(
          eventName,
          data
        );
        break;
      case "focus":
      case "change":
      case "blur":
      case "select":
        throw new Error(`Triggering event of type '${eventName}' not yet supported`);
      default:
        throw new Error(`Couldn't find an event class for event '${eventName}'.`);
    }
    if (ev) {
      node.dispatchEvent(ev);
    }
  } else {
    throw new Error(`Node has no 'dispatchEvent' method`);
  }
}
