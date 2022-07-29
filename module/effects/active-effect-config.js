import { GURPSActiveEffectsChanges } from './effects.js'

export default class GurpsActiveEffectConfig extends ActiveEffectConfig {
  get template() {
    return 'systems/gurps/templates/active-effects/active-effect-config.html'
  }

  getData() {
    const sheetData = super.getData()
    sheetData.changes = GURPSActiveEffectsChanges
    return sheetData
  }

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html)
    html.find('.gurps-effect-control').click(this._onEffectControl.bind(this))
  }

  /**
   * Provide centralized handling of mouse clicks on control buttons.
   * Delegate responsibility out to action-specific handlers depending on the button action.
   * @param {MouseEvent} event      The originating click event
   * @private
   */
  _onEffectControl(event) {}

  /** @inheritdoc */
  async _updateObject(event, formData) {
    // If there is an EndCondition, this is a temporary effect. Signal this by setting the core.statusId value.
    if (!formData.flags?.gurps?.effect) formData.flags.gurps = { effect: {} }
    let newEndCondition = formData.flags.gurps.effect.endCondition
    formData.flags['core.statusId'] = !!newEndCondition ? this.object.data.label : null

    let result = await super._updateObject(event, formData)

    // Tell the Active Effects List window to refresh its data.
    if (this._parentWindow) this._parentWindow.render(true)
    return result
  }

  /**
   * Add a reference to the 'parent' window into options so we can refresh it.
   * @param {*} force
   * @param {*} options
   */
  render(force, options = {}) {
    if (options.hasOwnProperty('parentWindow')) this._parentWindow = options.parentWindow
    return super.render(force, options)
  }
}
