from django.conf.urls import url

from webgis.wsdp.views import lv


urlpatterns = [
    url(r"^lv/(?P<lv_id>[-\w]+)/$", lv, name="lv")
]
