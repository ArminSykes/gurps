'use strict'

import { parselink } from '../../lib/parselink.js'
import { i18n, i18n_f } from '../../lib/utilities.js'

export default class GurpsActiveEffect extends ActiveEffect {
  static init() {
    CONFIG.ActiveEffect.documentClass = GurpsActiveEffect

    Hooks.on(
      'preCreateActiveEffect',
      async (
        /** @type {any} */ _effect,
        /** @type {{ duration: { combat: any; }; }} */ data,
        /** @type {any} */ _options,
        /** @type {any} */ _userId
      ) => {
        // Add combat id if necessary
        if (data.duration && !data.duration.combat && game.combat) data.duration.combat = game.combats?.active?.id
      }
    )

    Hooks.on(
      'createActiveEffect',
      async (/** @type {ActiveEffect} */ effect, /** @type {any} */ _data, /** @type {any} */ _userId) => {
        if (effect.getFlag('gurps', 'requiresConfig') === true) {
          let dialog = new ActiveEffectConfig(effect)
          await dialog.render(true)
        }
      }
    )

    /**
     * Applies only to changes that have mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM
     */
    Hooks.on('applyActiveEffect', (actor, change, _options, _user) => {
      if (change.key === 'data.conditions.maneuver') actor.replaceManeuver(change.value)
      else if (change.key === 'data.conditions.posture') actor.replacePosture(change)
      else if (change.key === 'chat') change.effect.chat(actor, JSON.parse(change.value))
      else console.log(change)
    })

    // Hooks.on(
    //   'updateActiveEffect',
    //   (
    //     /** @type {ActiveEffect} */ effect,
    //     /** @type {any} */ _data,
    //     /** @type {any} */ _options,
    //     /** @type {any} */ _userId
    //   ) => {}
    // )

    Hooks.on(
      'deleteActiveEffect',
      (/** @type {string} */ effect, /** @type {any} */ _data, /** @type {any} */ _userId) => {
        console.log('delete ' + effect)
        effect.terminateActions.filter(it => it.type === 'chat').forEach(it => effect.chat(effect.parent, it))
      }
    )

    Hooks.on(
      'updateCombat',
      async (
        /** @type {Combat} */ combat,
        /** @type {any} */ _data,
        /** @type {any} */ _options,
        /** @type {any} */ _userId
      ) => {
        // get previous combatant { round: 6, turn: 0, combatantId: 'id', tokenId: 'id' }
        let previous = combat.previous
        if (previous.tokenId) {
          let token = canvas.tokens?.get(previous.tokenId)

          // go through all effects, removing those that have expired
          if (token && token.actor) {
            for (const effect of token.actor.effects) {
              if (await effect.isExpired())
                ui.notifications.info(
                  `${i18n('GURPS.effectExpired', 'Effect has expired: ')} '[${i18n(effect.data.label)}]'`
                )
            }
          }
        }
      }
    )
  }

  /**
   * @param {ActiveEffectData} data
   * @param {any} context
   */
  constructor(data, context) {
    super(data, context)

    this.context = context
    this.chatmessages = []
  }

  get endCondition() {
    return this.getFlag('gurps', 'effect.endCondition')
  }

  get terminateActions() {
    let data = this.getFlag('gurps', 'effect.terminateActions')
    return data ?? []
  }

  /**
   * @param {ActiveEffect} effect
   */
  static getName(effect) {
    return /** @type {string} */ (effect.getFlag('gurps', 'name'))
  }

  static async clearEffectsOnSelectedToken() {
    const effect = _token.actor.effects.contents
    for (let i = 0; i < effect.length; i++) {
      let condition = effect[i].data.label
      let status = effect[i].data.disabled
      let effect_id = effect[i].data._id
      console.log(`Clear Effect: condition: [${condition}] status: [${status}] effect_id: [${effect_id}]`)
      if (status === false) {
        await _token.actor.deleteEmbeddedDocuments('ActiveEffect', [effect_id])
      }
    }
  }

  chat(actor, value) {
    if (!!value?.frequency && value.frequency === 'once') {
      if (this.chatmessages.includes(value.msg)) {
        console.log(`Message [${value.msg}] already displayed, do nothing`)
        return
      }
    }

    for (const key in value.args) {
      let val = value.args[key]
      if (foundry.utils.getType(val) === 'string' && val.startsWith('@')) {
        value.args[key] = actor[val.slice(1)]
      } else if (foundry.utils.getType(val) === 'string' && val.startsWith('!')) {
        value.args[key] = i18n(val.slice(1))
      }
      if (key === 'pdfref') value.args.pdfref = i18n(val)
    }

    let msg = !!value.args ? i18n_f(value.msg, value.args) : i18n(value.msg)

    let self = this
    renderTemplate('systems/gurps/templates/chat-processing.html', { lines: [msg] }).then(content => {
      let users = actor.getOwners()
      let ids = /** @type {string[] | undefined} */ (users?.map(it => it.id))

      let messageData = {
        content: content,
        whisper: ids || null,
        type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      }
      ChatMessage.create(messageData)
      ui.combat?.render()
      self.chatmessages.push(value.msg)
    })
  }

  async isExpired() {
    if (this.duration && !!this.duration.duration) {
      if (this.duration.remaining <= 1) {
        return true
      }
    }

    // if (!!this.endCondition) {
    //   let action = parselink(this.endCondition)

    //   if (!!action.action) {
    //     if (action.action.type === 'modifier') {
    //       ui.notifications.warn(
    //         `${i18n(
    //           'GURPS.effectBadEndCondition',
    //           'End Condition is not a skill or attribute test: '
    //         )} '[${endCondition}]'`
    //       )
    //       return false
    //     }

    //     return await GURPS.performAction(action.action, this.parent, {
    //       shiftKey: false,
    //       ctrlKey: false,
    //       data: {},
    //     })
    //   } // Looks like a /roll OtF, but didn't parse as one
    //   else
    //     ui.notifications.warn(
    //       `${i18n(
    //         'GURPS.effectBadEndCondition',
    //         'End Condition is not a skill or attribute test: '
    //       )} '[${endCondition}]'`
    //     )
    // }

    return false
  }
}

/*
  {
    key: fields.BLANK_STRING,
    value: fields.BLANK_STRING,
    mode: {
      type: Number,
      required: true,
      default: CONST.ACTIVE_EFFECT_MODES.ADD,
      validate: m => Object.values(CONST.ACTIVE_EFFECT_MODES).includes(m),
      validationError: "Invalid mode specified for change in ActiveEffectData"
      },
      priority: fields.NUMERIC_FIELD
    }
*/
