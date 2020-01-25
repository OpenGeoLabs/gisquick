from django.urls import re_path

from webgis.wsdp import views


urlpatterns = [
    re_path(r"^lv/(?P<typ>\w+)/(?P<vypis>[na])/(?P<lv_id>\d+)/$", views.lv, name="lv")
]

