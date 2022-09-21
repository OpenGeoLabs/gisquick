<template>
  <v-dialog
    ref="dialog"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <div class="toolbar f-row-ac dark">
      <translate class="title">Change password</translate>
      <div class="f-grow"/>
      <v-btn class="icon small" @click="close">
        <v-icon name="x"/>
      </v-btn>
    </div>
    <div class="form f-col">
      <div v-if="task.error" class="error f-row-ac m-2">
        <v-icon name="circle-error" color="red" size="20"/>
        <translate class="mx-2">
          Failed to change the password!
        </translate>
      </div>
      <v-text-field
        :label="tr.CurrentPassword"
        v-model="currentPassword"
        class="filled"
        :type="currentPasswordVisible ? 'text' : 'password'"
      >
        <v-btn
          slot="append"
          tabindex="-1"
          class="small icon flat"
          @click="currentPasswordVisible = !currentPasswordVisible"
        >
          <v-icon :name="currentPasswordVisible ? 'visibility_off' : 'visibility'"/>
        </v-btn>
      </v-text-field>
      <v-text-field
        :label="tr.NewPassword"
        class="filled"
        v-model="newPassword1"
        :type="newPasswordVisible ? 'text' : 'password'"
      >
        <v-btn
          slot="append"
          tabindex="-1"
          class="small icon flat"
          @click="newPasswordVisible = !newPasswordVisible"
        >
          <v-icon :name="newPasswordVisible ? 'visibility_off' : 'visibility'"/>
        </v-btn>
      </v-text-field>
      <v-text-field
        :label="tr.ConfirmPassword"
        class="filled"
        v-model="newPassword2"
        :type="newPasswordVisible ? 'text' : 'password'"
      />
      <div class="actions f-row-ac f-justify-end">
        <v-btn color="dark" @click="close">
          <translate>Close</translate>
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!formValid"
          :loading="task.pending"
          @click="confirm"
        >
          <translate>Confirm</translate>
        </v-btn>
      </div>
    </div>
  </v-dialog>
</template>

<script>
import { TaskState, watchTask } from '@/tasks'

export default {
  data () {
    return {
      open: false,
      task: TaskState(),
      currentPasswordVisible: false,
      newPasswordVisible: false,
      currentPassword: '',
      newPassword1: '',
      newPassword2: ''
    }
  },
  computed: {
    formValid () {
      return this.currentPassword && this.newPassword1 && this.newPassword1 === this.newPassword2
    },
    tr () {
      return {
        CurrentPassword: this.$gettext('Current password'),
        NewPassword: this.$gettext('New password'),
        ConfirmPassword: this.$gettext('Confirm password')
      }
    }
  },
  methods: {
    reset () {
      Object.assign(this.$data, this.$options.data.apply(this))
    },
    close () {
      this.$refs.dialog.close()
    },
    show () {
      this.reset()
      this.$refs.dialog.show()
    },
    async confirm () {
      const form = {
        old_password: this.currentPassword,
        new_password1: this.newPassword1,
        new_password2: this.newPassword1
      }
      const task = this.$http.post('/api/accounts/change_password/', form)
      await watchTask(task, this.task)
      if (!this.task.error) {
        this.close()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.toolbar {
  background-color: var(--color-dark);
  height: 40px;
  padding-inline: 12px 6px;
  width: clamp(200px, 400px, calc(100vw - 16px));
  .title {
    font-size: 17px;
  }
}
.form {
  background-color: #f3f3f3;
  padding: 6px;
  padding-top: 12px;
  --icon-color: #555;
}
.error {
  color: var(--color-red);
  font-weight: 500;
}
.actions {
  margin-top: 16px;
  .btn {
    min-width: 100px;
  }
}
</style>
