// Unit test of the public controller with DOM doubles; no browser or external service.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

class Element {
  children = [];
  listeners = {};
  dataset = {};
  style = {};
  value = "";
  selectedOptions = [];
  classList = { add() {} };
  append(...nodes) {
    this.children.push(...nodes);
  }
  prepend(node) {
    this.children.unshift(node);
  }
  after() {}
  setAttribute() {}
  removeAttribute() {}
  addEventListener(event, callback) {
    this.listeners[event] = callback;
  }
  querySelector(selector) {
    if (selector === "label") return this.label;
    return (
      this.children.find((child) => child.tagName === selector.toUpperCase()) ||
      this.children
        .map((child) => child.querySelector?.(selector))
        .find(Boolean)
    );
  }
  querySelectorAll() {
    return [];
  }
  replaceChildren() {
    this.children = [];
  }
  setCustomValidity(value) {
    this.validation = value;
  }
  reportValidity() {
    return !this.validation;
  }
  focus() {
    this.focused = true;
  }
  pause() {
    this.paused = true;
  }
}
const source = fs.readFileSync("public/forms-assets/public-flow.js", "utf8");
for (const type of ["text", "multiple"]) {
  for (const mode of ["steps", "all"]) {
    for (const legacyWelcome of [
      undefined,
      { enabled: false },
      {
        enabled: true,
        title: "Olá",
        layout: "left",
        media: { type: "video", src: "/cover.mp4" },
      },
    ]) {
      const field = {
        key: "name",
        type,
        label: "Seu nome",
        required: true,
        options:
          type === "multiple" ? ["Menos de R$ 1.000,00", "Outra opção"] : [],
      };
      const input = new Element();
      input.multiple = type === "multiple";
      input.options = field.options.map((value) => ({
        value,
        selected: false,
      }));
      const question = new Element();
      question.label = new Element();
      const form = new Element();
      form.dataset.definition = JSON.stringify({
        mode,
        fields: [field],
        welcome: legacyWelcome,
      });
      form.elements = { consent: new Element() };
      form.querySelectorAll = () => [question];
      const elements = Object.fromEntries(
        [
          "flow-review",
          "flow-summary",
          "flow-navigation",
          "flow-back",
          "flow-next",
          "flow-progress",
          "flow-submit",
        ].map((id) => ["#" + id, new Element()]),
      );
      elements["#public-flow"] = form;
      elements[".flow-introduction"] = new Element();
      const document = {
        querySelector: (key) => elements[key],
        getElementById: () => input,
        createTextNode: (text) => ({ textContent: text }),
        createElement(tag) {
          const node = new Element();
          node.tagName = tag.toUpperCase();
          return node;
        },
      };
      let routed;
      const context = vm.createContext({
        document,
        window: { addEventListener() {} },
        BadonFlow: {
          path: (_fields, values) => {
            routed = values.name;
            return [0];
          },
          next: (_fields, _index, values) => {
            routed = values.name;
            return { index: -1 };
          },
        },
      });
      vm.runInContext(source, context);
      const welcome = form.children[0];
      assert.equal(welcome.hidden, false);
      assert.equal(question.hidden, true);
      assert.equal(elements["#flow-review"].hidden, true);
      assert.equal(elements["#flow-navigation"].hidden, true);
      assert.equal(elements["#flow-submit"].disabled, true);
      let blocked = false;
      form.listeners.submit({
        preventDefault() {
          blocked = true;
        },
      });
      assert.equal(blocked, true, "Cannot submit from the cover");
      welcome.querySelector("button").listeners.click();
      assert.equal(welcome.hidden, true);
      assert.equal(question.hidden, false);
      assert.equal(input.focused, true);
      if (legacyWelcome?.media)
        assert.equal(welcome.querySelector("video").paused, true);
      if (mode === "steps") {
        assert.equal(elements["#flow-review"].hidden, true);
        elements["#flow-next"].listeners.click();
        assert.equal(
          elements["#flow-review"].hidden,
          true,
          "Empty required answer cannot advance",
        );
        input.value = "Nome teste";
        if (input.multiple)
          input.selectedOptions = [{ value: "Menos de R$ 1.000,00" }];
        elements["#flow-next"].listeners.click();
        if (input.multiple) {
          assert.equal(Array.isArray(routed), true);
          assert.equal(routed[0], "Menos de R$ 1.000,00");
          assert.equal(
            elements["#flow-summary"].children[0].children[1].textContent,
            "Menos de R$ 1.000,00",
          );
        }
        assert.equal(elements["#flow-review"].hidden, false);
        assert.equal(question.hidden, true);
      } else {
        assert.equal(elements["#flow-review"].hidden, false);
      }
      assert.equal(elements["#flow-submit"].disabled, false);
      assert.equal(
        form.elements.consent.checked,
        undefined,
        "Consent is not checked automatically",
      );
    }
  }
}
console.log(
  "OK: capa inicial em formulários novos/legados, modos etapas/todos, início, vídeo e confirmação.",
);
