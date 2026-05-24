Component({
  properties: {
    gender: { type: String, value: 'female' }
  },

  data: {
    modelSrc: '/models/avatar-female.glb'
  },

  observers: {
    gender: function (g) {
      const src = g === 'male' ? '/models/avatar-male.glb' : '/models/avatar-female.glb'
      this.setData({ modelSrc: src })
    }
  },

  methods: {}
})
