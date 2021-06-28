from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import get_user_model


class SignupForm(forms.ModelForm):
    email = forms.EmailField(max_length=200, help_text='Required')
    url = forms.URLField(required=True)

    class Meta:
        model = get_user_model()
        fields = ('username', 'email', 'first_name', 'last_name')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_unusable_password()
        if commit:
            user.save()
        return user
